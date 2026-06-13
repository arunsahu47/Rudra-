/**
 * Convert Float32Array from AudioBuffer to PCM16 Base64
 */
export function pcmToBase64(channelData: Float32Array): string {
  const buffer = new ArrayBuffer(channelData.length * 2);
  const view = new DataView(buffer);
  
  for (let i = 0; i < channelData.length; i++) {
    // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
    let s = Math.max(-1, Math.min(1, channelData[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(i * 2, s, true); // true = little-endian
  }
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Handle audio play chunks from PCM16 Base64 to web audio.
 * Real-time gapless playback requires tracking the next start time.
 */
let nextStartTime = 0;

export function resetAudioQueue() {
  nextStartTime = 0;
}

export function playAudioChunk(audioCtx: AudioContext, base64Audio: string) {
  // Decode Base64 to Uint8Array
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Convert PCM16 (little-endian) to Float32
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }
  
  // Create AudioBuffer
  const buffer = audioCtx.createBuffer(1, float32.length, 24000); // 24kHz
  buffer.getChannelData(0).set(float32);
  
  // Schedule playback
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  
  if (nextStartTime < audioCtx.currentTime) {
    nextStartTime = audioCtx.currentTime;
  }
  
  source.start(nextStartTime);
  nextStartTime += buffer.duration;
}
