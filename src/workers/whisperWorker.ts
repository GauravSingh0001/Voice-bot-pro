import { pipeline, env } from '@huggingface/transformers';

env.allowRemoteModels = true;
env.allowLocalModels = false;

declare const self: Worker;

let transcriber: unknown = null;
let isInitialized = false;

interface WhisperMessage {
  type: 'init' | 'transcribe';
  audioData?: Float32Array;
  language?: string;
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
        self.postMessage({ type: 'loading', message: 'Loading speech recognition...' });

        try {
          transcriber = await pipeline(
            'automatic-speech-recognition',
            'Xenova/whisper-tiny.en',
            {
              device: 'wasm',
              dtype: 'fp32'
            }
          );

          isInitialized = true;
          console.log('✅ Whisper ready');
          self.postMessage({ type: 'ready' });

        } catch (initError: unknown) {
          const errorMessage = initError instanceof Error ? initError.message : 'Unknown error';
          console.error('❌ Whisper failed:', errorMessage);
          self.postMessage({ 
            type: 'error', 
            error: `Whisper failed: ${errorMessage}` 
          });
        }
        break;

      case 'transcribe':
        if (!transcriber || !isInitialized) {
          self.postMessage({ 
            type: 'error', 
            error: 'Whisper not ready' 
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
          const transcriberFn = transcriber as (audioData: Float32Array, options?: Record<string, unknown>) => Promise<{ text: string }>;
          const result = await transcriberFn(audioData, {
            return_timestamps: false,
            chunk_length_s: 10,
            stride_length_s: 1,
            no_speech_threshold: 0.8
          });

          const text = result?.text?.trim() || '';
          console.log('✅ Transcription complete:', text);

          self.postMessage({ 
            type: 'transcript', 
            text: text,
            isFinal: true 
          });
          
        } catch (transcribeError: unknown) {
          const errorMessage = transcribeError instanceof Error ? transcribeError.message : 'Unknown error';
          console.error('❌ Transcription error:', errorMessage);
          self.postMessage({ 
            type: 'error', 
            error: `Transcription failed: ${errorMessage}` 
          });
        }
        break;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Worker processing failed';
    console.error('Worker error:', errorMessage);
    self.postMessage({ 
      type: 'error', 
      error: errorMessage
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
