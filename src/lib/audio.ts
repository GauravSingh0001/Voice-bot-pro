export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private audioChunks: Float32Array[] = [];
  private isRecording = false;
  
  async startRecording(): Promise<void> {
    try {
      console.log('Requesting microphone access...');
      
      // Request microphone access with optimal settings for speech
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000, // Whisper works best with 16kHz
          channelCount: 1,   // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Create audio context for processing
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 16000 
      });
      
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      
      // Create processor for capturing audio data
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (event) => {
        if (this.isRecording) {
          const inputData = event.inputBuffer.getChannelData(0);
          // Store audio chunks for final processing
          this.audioChunks.push(new Float32Array(inputData));
        }
      };
      
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isRecording = true;
      console.log('Audio recording started');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to access microphone. Please check permissions.');
    }
  }
  
  stopRecording(): Float32Array {
    console.log('Stopping audio recording...');
    
    this.isRecording = false;
    
    // Clean up audio processing
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    // Combine all audio chunks into a single array
    const totalLength = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedAudio = new Float32Array(totalLength);
    let offset = 0;
    
    for (const chunk of this.audioChunks) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }
    
    const duration = combinedAudio.length / 16000;
    console.log(`Recording complete: ${duration.toFixed(2)} seconds`);
    
    // Clear chunks for next recording
    this.audioChunks = [];
    
    return combinedAudio;
  }
}

export function playAudioBuffer(audioBuffer: Float32Array, sampleRate: number): void {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = audioContext.createBuffer(1, audioBuffer.length, sampleRate);
  buffer.copyToChannel(audioBuffer, 0);
  
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
}
