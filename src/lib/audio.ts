// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as Window & typeof globalThis & {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async processAudio(audioData: Float32Array, options: any = {}): Promise<Float32Array> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }
    
    const processedData = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      processedData[i] = audioData[i] * (options.gain || 1.0);
    }
    
    return processedData;
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
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleError(error: any): void {
    if (error instanceof Error) {
      console.error('Audio processing error:', error.message);
    } else {
      console.error('Unknown audio processing error:', String(error));
    }
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
