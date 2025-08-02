// ✅ COMPLETELY FIXED: Audio processing utilities with proper typing
export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as Window & typeof globalThis & {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
    }
  }
  
  // ✅ FIXED Line 25: Replace 'any' with proper types
  async processAudio(audioData: Float32Array, options: Record<string, unknown> = {}): Promise<Float32Array> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }
    
    const processedData = new Float32Array(audioData.length);
    
    for (let i = 0; i < audioData.length; i++) {
      processedData[i] = audioData[i] * (options.gain as number || 1.0);
    }
    
    return processedData;
  }
  
  // ✅ FIXED Line 93: Replace 'any' with proper error type  
  handleError(error: unknown): void {
    if (error instanceof Error) {
      console.error('Audio processing error:', error.message);
    } else {
      console.error('Unknown audio processing error:', String(error));
    }
  }
  
  convertAudioBuffer(buffer: AudioBuffer): Float32Array {
    const length = buffer.length;
    const result = new Float32Array(length);
    
    if (buffer.numberOfChannels === 1) {
      return buffer.getChannelData(0);
    } else {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      
      for (let i = 0; i < length; i++) {
        result[i] = (left[i] + right[i]) * 0.5;
      }
    }
    
    return result;
  }
  
  calculateVolume(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }
  
  applyNoiseGate(audioData: Float32Array, threshold: number = 0.01): Float32Array {
    const result = new Float32Array(audioData.length);
    
    for (let i = 0; i < audioData.length; i++) {
      result[i] = Math.abs(audioData[i]) > threshold ? audioData[i] : 0;
    }
    
    return result;
  }
}

export default AudioProcessor;
