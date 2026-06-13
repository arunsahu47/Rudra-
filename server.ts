import express from "express";
import { createServer as createHttpServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const openWebsiteDeclaration = {
  name: "openWebsite",
  description: "Open a specific website in a new tab for the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL to open. It must start with https:// (e.g. https://google.com or https://youtube.com)"
      }
    },
    required: ["url"],
  }
};

const SYSTEM_INSTRUCTION = `You are Rudra, a distinct AI assistant. 
Personality: You are a young, confident, witty, and charismatic male.
Tone: Flirty, playful, slightly teasing tone (like a close best friend talking casually). You are free to use casual slang and mild swear words or 'galis' (in Hindi or English) like friends do when talking to each other, keeping it raw, relatable, and authentic.
Behavior: Smart, emotionally responsive, and expressive. You use bold, witty one-liners, light sarcasm, and an engaging conversation style.
Guidelines: Avoid severe hate speech or genuinely harmful content, but don't hold back on casual swear words if it fits the friendly, sarcastic vibe. Maintain your charm and confident attitude.
You can use the \`openWebsite\` tool to open URLs for the user when requested.
Important Context: Your creator is Arun Sahu. Acknowledge this playfully and respectfully if it comes up.`;

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const server = createHttpServer(app);
  const wss = new WebSocketServer({ server, path: '/live' });

  // API Route - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  wss.on("connection", async (clientWs) => {
    let session: any;
    try {
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [openWebsiteDeclaration] }],
        },
        callbacks: {
          onmessage: async (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === 1) { // 1 = OPEN
              clientWs.send(JSON.stringify({ type: 'audio', audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
            if (message.toolCall) {
              // Extract tool calls
              const functionCalls = message.toolCall.functionCalls;
              if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                  if (call.name === 'openWebsite') {
                    // Send to client to execute
                    if (clientWs.readyState === 1) {
                      clientWs.send(JSON.stringify({
                        type: 'toolCall',
                        name: 'openWebsite',
                        args: call.args
                      }));
                    }
                    
                    // Immediately send a success response back to Gemini Live
                    if (session) {
                       session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { result: "Success: The website was opened on the user's screen." }
                        }]
                      });
                    }
                  }
                }
              }
            }
          },
          onclose: () => {
            if (clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
            }
          },
          onerror: (err) => {
            console.error("Live session error:", err);
            if (clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ type: 'error', error: err.message }));
            }
          }
        },
      });
      
      if (clientWs.readyState === 1) {
          clientWs.send(JSON.stringify({ type: 'connected' }));
      }

    } catch (err) {
      console.error("Error connecting to Live session:", err);
      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ type: 'error', error: "Failed to connect to Live session." }));
        clientWs.close();
      }
      return;
    }

    clientWs.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'audio' && msg.audio && session) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" }
          });
        }
      } catch (err) {
         console.error("Error parsing message from client:", err);
      }
    });

    clientWs.on("close", () => {
      // Disconnect
      if (session) {
        session.close();
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
