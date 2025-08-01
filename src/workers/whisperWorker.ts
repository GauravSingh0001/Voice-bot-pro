import { pipeline, env } from '@huggingface/transformers';

// ✅ FIXED: Remove the problematic wasm configuration entirely
env.allowRemoteModels = true;
env.allowLocalModels = false;

// ✅ Don't try to modify the read-only wasm property
// The library will handle WASM paths automatically

declare const self: Worker;

let transcriber: any = null;
let isInitialized = false;

interface WhisperMessage {
  type: 'init' | 'transcribe';
  audioData?: Float32Array;
}

self.onmessage = async (event: MessageEvent<WhisperMessage>) => {
  const { type, audioData } = event.data;

  try {
    switch (type) {
      case 'init':
        if (isInitialized) {
          self.postMessage({ type: 'ready' });
          return;
        }

        console.log('🔄 Loading Whisper model...');
        self.postMessage({ type: 'loading', message: 'Loading Whisper model...' });

        try {
          transcriber = await pipeline(
            'automatic-speech-recognition', 
            'Xenova/whisper-tiny.en',
            {
              progress_callback: (progress: any) => {
                try {
                  if (progress?.status === 'downloading' && progress.loaded && progress.total) {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    self.postMessage({ 
                      type: 'loading', 
                      message: `Downloading: ${percent}%` 
                    });
                  } else if (progress?.status === 'loading') {
                    self.postMessage({ 
                      type: 'loading', 
                      message: 'Initializing model...' 
                    });
                  }
                } catch (progressError) {
                  console.warn('Progress callback error:', progressError);
                }
              }
            }
          );
          
          isInitialized = true;
          console.log('✅ Whisper model ready');
          self.postMessage({ type: 'ready' });
        } catch (error: any) {
          console.error('❌ Whisper init error:', error);
          self.postMessage({ 
            type: 'error', 
            error: error.message || 'Failed to load Whisper model' 
          });
        }
        break;

      case 'transcribe':
        if (!transcriber || !isInitialized) {
          self.postMessage({ 
            type: 'error', 
            error: 'Whisper model not ready' 
          });
          return;
        }

        if (!audioData || audioData.length === 0) {
          self.postMessage({ 
            type: 'error', 
            error: 'No audio data provided' 
          });
          return;
        }

        try {
          console.log('🎯 Transcribing audio...');
          const result = await transcriber(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: false,
            force_full_sequences: false
          });
          
          const text = typeof result === 'string' ? result.trim() : 
                      result?.text?.trim() || '';
          
          console.log('✅ Transcription result:', text);
          
          self.postMessage({ 
            type: 'transcript', 
            text: text,
            isFinal: true 
          });
        } catch (error: any) {
          console.error('❌ Transcription error:', error);
          self.postMessage({ 
            type: 'error', 
            error: error.message || 'Transcription failed' 
          });
        }
        break;

      default:
        console.warn('Unknown message type:', type);
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

// ✅ Simple error handler
self.onerror = (error) => {
  console.error('❌ Worker error:', error);
  self.postMessage({ 
    type: 'error', 
    error: 'Worker script error occurred' 
  });
};
