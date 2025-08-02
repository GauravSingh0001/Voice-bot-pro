import { pipeline, env } from '@huggingface/transformers';

env.allowRemoteModels = true;
env.allowLocalModels = false;

declare const self: Worker;

let transcriber: any = null;
let isInitialized = false;

interface WhisperMessage {
  type: 'init' | 'transcribe';
  audioData?: Float32Array;
  language?: string;
}

// ✅ OPTIMIZED: Start with fastest loading model first
const initializeTranscriber = async (): Promise<void> => {
  console.log('🔄 Loading fast speech recognition...');
  self.postMessage({ type: 'loading', message: 'Loading fast model...' });

  // ✅ Start with tiny model (loads in ~10-30 seconds instead of 2-5 minutes)
  try {
    console.log('🚀 Loading tiny model for instant availability...');
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en',  // ✅ Smallest, fastest model
      {
        device: 'wasm',
        dtype: 'fp32'
      }
    );
    console.log('✅ Fast model ready!');
    self.postMessage({ type: 'loading', message: 'Fast model loaded!' });
    return;
  } catch (tinyError) {
    console.warn('⚠️ Tiny model failed, trying base...');
  }

  // ✅ Only try larger models if tiny fails
  try {
    console.log('🔄 Loading base model...');
    self.postMessage({ type: 'loading', message: 'Loading enhanced model...' });
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-base.en',  // ✅ Medium size, good performance
      {
        device: 'wasm',
        dtype: 'fp32'
      }
    );
    console.log('✅ Base model loaded');
    return;
  } catch (baseError: any) {
    console.error('❌ All models failed:', baseError);
    throw new Error(`Speech recognition failed: ${baseError.message}`);
  }
};

self.onmessage = async (event: MessageEvent<WhisperMessage>) => {
  const { type, audioData, language = 'en' } = event.data;

  try {
    switch (type) {
      case 'init':
        if (isInitialized) {
          self.postMessage({ type: 'ready' });
          return;
        }

        try {
          await initializeTranscriber();
          isInitialized = true;
          self.postMessage({ type: 'ready' });
        } catch (initError: any) {
          self.postMessage({ 
            type: 'error', 
            error: `Failed to load speech recognition: ${initError.message}` 
          });
        }
        break;

      case 'transcribe':
        if (!transcriber || !isInitialized) {
          self.postMessage({ 
            type: 'error', 
            error: 'Speech recognition not ready' 
          });
          return;
        }

        if (!audioData || audioData.length === 0) {
          self.postMessage({ 
            type: 'error', 
            error: 'No audio data' 
          });
          return;
        }

        console.log('🎯 Processing audio...');

        try {
          // ✅ Simplified parameters for faster processing
          const result = await transcriber(audioData, {
            return_timestamps: false,
            chunk_length_s: 15,  // ✅ Smaller chunks for speed
            stride_length_s: 2   // ✅ Less overlap for speed
          });

          const text = result?.text?.trim() || '';
          console.log('✅ Transcription complete:', text);

          self.postMessage({ 
            type: 'transcript', 
            text: text,
            isFinal: true 
          });
          
        } catch (transcribeError: any) {
          console.error('❌ Transcription error:', transcribeError);
          self.postMessage({ 
            type: 'error', 
            error: `Transcription failed: ${transcribeError.message}` 
          });
        }
        break;
    }
  } catch (error: any) {
    console.error('❌ Worker error:', error);
    self.postMessage({ 
      type: 'error', 
      error: error.message || 'Worker processing failed' 
    });
  }
};

self.onerror = (error: ErrorEvent) => {
  console.error('❌ Worker script error:', error);
  self.postMessage({ 
    type: 'error', 
    error: 'Worker script error occurred' 
  });
};
