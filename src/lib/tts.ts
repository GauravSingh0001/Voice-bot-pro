export class TextToSpeech {
  private synthesis: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private isInitialized = false;
  
  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    } else {
      console.warn('Speech synthesis not available in this environment');
    }
  }
  
  private loadVoices() {
    if (!this.synthesis) return;
    
    const loadVoicesWhenReady = () => {
      const voices = this.synthesis!.getVoices();
      if (voices.length > 0) {
        // Prefer English voices, fallback to first available
        this.voice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        console.log('TTS Voice selected:', this.voice?.name, this.voice?.lang);
        this.isInitialized = true;
      } else {
        // Voices not ready yet, try again
        setTimeout(loadVoicesWhenReady, 100);
      }
    };
    
    if (this.synthesis.getVoices().length > 0) {
      loadVoicesWhenReady();
    } else {
      this.synthesis.addEventListener('voiceschanged', loadVoicesWhenReady);
    }
  }
  
  async speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported in this environment'));
        return;
      }
      
      if (!this.isInitialized) {
        reject(new Error('TTS not initialized yet. Please wait for voices to load.'));
        return;
      }
      
      // Stop any ongoing speech
      this.synthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings
      if (this.voice) {
        utterance.voice = this.voice;
      }
      utterance.rate = 1.1;      // Slightly faster for responsiveness
      utterance.pitch = 1.0;     // Normal pitch
      utterance.volume = 0.8;    // Slightly quieter
      
      // Event handlers
      utterance.onend = () => {
        console.log('TTS playback completed');
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('TTS error:', event.error);
        reject(new Error(`TTS failed: ${event.error}`));
      };
      
      utterance.onstart = () => {
        console.log('TTS playback started');
      };
      
      // Start speaking
      this.synthesis.speak(utterance);
    });
  }
  
  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
  
  isReady(): boolean {
    return this.isInitialized && !!this.synthesis;
  }
}
