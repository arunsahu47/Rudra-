import { pcmToBase64, playAudioChunk, resetAudioQueue } from './audio-utils';

export type SessionState = 'disconnected' | 'connecting' | 'listening' | 'speaking';

export class LiveSession {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  
  private onStateChange: (state: SessionState) => void;
  private state: SessionState = 'disconnected';
  
  // We consider it speaking if we receive audio. After a timeout of no audio, we revert back to listening.
  private speakingTimeoutId: any = null;

  constructor(onStateChange: (state: SessionState) => void) {
    this.onStateChange = onStateChange;
  }

  private setState(newState: SessionState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  async connect() {
    if (this.state !== 'disconnected') return;
    this.setState('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.ws = new WebSocket(`${protocol}//${location.host}/live`);
      
      this.ws.onopen = async () => {
        // Init audio
        await this.initAudio();
        // State will move to 'listening' when server says 'connected' or immediately
      };
      
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'connected') {
          this.setState('listening');
        } else if (msg.type === 'audio' && msg.audio) {
          if (this.outputAudioCtx) {
            playAudioChunk(this.outputAudioCtx, msg.audio);
          }
          if (this.state !== 'speaking') {
             this.setState('speaking');
          }
          // Debounce going back to listening
          if (this.speakingTimeoutId) clearTimeout(this.speakingTimeoutId);
          this.speakingTimeoutId = setTimeout(() => {
             if (this.state === 'speaking') {
               this.setState('listening');
             }
          }, 500); // 500ms after last audio chunk
        } else if (msg.type === 'interrupted') {
          this.handleInterruption();
        } else if (msg.type === 'toolCall') {
           if (msg.name === 'openWebsite' && msg.args?.url) {
             console.log("Opening website:", msg.args.url);
             window.open(msg.args.url, "_blank", "noopener,noreferrer");
           }
        } else if (msg.type === 'closed') {
           this.disconnect();
        } else if (msg.type === 'error') {
           console.error("Live session error:", msg.error);
           this.disconnect();
        }
      };
      
      this.ws.onclose = () => {
        this.disconnect();
      };
      
      this.ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
      };
    } catch (e) {
      console.error(e);
      this.disconnect();
    }
  }

  private async initAudio() {
    this.inputAudioCtx = new AudioContext({ sampleRate: 16000 });
    this.outputAudioCtx = new AudioContext({ sampleRate: 24000 });
    resetAudioQueue();

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.inputAudioCtx.createMediaStreamSource(this.stream);
    
    // ScriptProcessor is deprecated but widely used for raw PCM extraction across browsers
    this.processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioCtx.destination);
    
    this.processor.onaudioprocess = (e) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
        this.ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
      }
    };
  }

  private handleInterruption() {
    console.log("Interruption received.");
    if (this.outputAudioCtx) {
      this.outputAudioCtx.close().then(() => {
        this.outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      });
      resetAudioQueue();
    }
    if (this.state === 'speaking') {
        this.setState('listening');
    }
  }

  disconnect() {
    this.setState('disconnected');
    
    if (this.speakingTimeoutId) clearTimeout(this.speakingTimeoutId);
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.inputAudioCtx) {
      this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx) {
      this.outputAudioCtx.close();
      this.outputAudioCtx = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    resetAudioQueue();
  }
}
