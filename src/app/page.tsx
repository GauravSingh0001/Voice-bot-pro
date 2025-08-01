'use client';

import { useState, useRef, useEffect } from 'react';

// ✅ Production-ready TTS Class
class TextToSpeech {
  private synthesis: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private isInitialized = false;
  
  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    }
  }
  
  private loadVoices() {
    if (!this.synthesis) return;
    
    const loadVoicesWhenReady = () => {
      const voices = this.synthesis!.getVoices();
      if (voices.length > 0) {
        this.voice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        this.isInitialized = true;
      } else {
        setTimeout(loadVoicesWhenReady, 100);
      }
    };
    
    if (this.synthesis.getVoices().length > 0) {
      loadVoicesWhenReady();
    } else {
      this.synthesis.addEventListener('voiceschanged', loadVoicesWhenReady);
    }
  }
  
  async speak(text: string, rate: number = 1.2, volume: number = 0.8): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis || !this.isInitialized) {
        reject(new Error('TTS not available'));
        return;
      }
      
      this.synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (this.voice) utterance.voice = this.voice;
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = volume;
      
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`TTS failed: ${event.error}`));
      
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
  
  prepare(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isReady()) {
        resolve();
      } else {
        setTimeout(() => resolve(), 50);
      }
    });
  }
}

// ✅ AudioRecorder Class
class AudioRecorder {
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private audioChunks: Float32Array[] = [];
  private isRecording = false;
  
  async startRecording(): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 16000,
        latencyHint: 'interactive'
      });
      
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        if (this.isRecording) {
          const inputData = event.inputBuffer.getChannelData(0);
          const threshold = 0.01;
          const hasSignal = inputData.some(sample => Math.abs(sample) > threshold);
          
          if (hasSignal) {
            this.audioChunks.push(new Float32Array(inputData));
          }
        }
      };
      
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording = true;
      
    } catch (error) {
      throw new Error('Failed to access microphone. Please check permissions.');
    }
  }
  
  stopRecording(): Float32Array {
    this.isRecording = false;
    
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
    
    const totalLength = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    if (totalLength === 0) return new Float32Array(0);
    
    const combinedAudio = new Float32Array(totalLength);
    let offset = 0;
    
    for (const chunk of this.audioChunks) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }
    
    this.audioChunks = [];
    return combinedAudio;
  }
}

// ✅ Interface Definitions
interface VoiceSettings {
  ttsRate: number;
  ttsVolume: number;
  enableCaching: boolean;
  retryAttempts: number;
}

interface PerformanceMetrics {
  stt?: number;
  api?: number;
  tts?: number;
  total?: number;
}

interface LatencyPanelProps {
  sttTime?: number;
  apiTime?: number;
  ttsTime?: number;
  totalTime?: number;
  performanceHistory: number[];
}

function LatencyPanel({ sttTime, apiTime, ttsTime, totalTime, performanceHistory }: LatencyPanelProps) {
  const averageTime = performanceHistory.length > 0 
    ? Math.round(performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length)
    : 0;

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <h3 className="font-semibold mb-2">Performance Metrics</h3>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>STT: {sttTime ? `${sttTime}ms` : '-'}</div>
        <div>API: {apiTime ? `${apiTime}ms` : '-'}</div>
        <div>TTS: {ttsTime ? `${ttsTime}ms` : '-'}</div>
        <div className="font-semibold">Total: {totalTime ? `${totalTime}ms` : '-'}</div>
      </div>
      
      {totalTime && (
        <div className={`mb-2 text-sm ${totalTime < 1200 ? 'text-green-600' : 'text-red-600'}`}>
          Target: &lt; 1200ms {totalTime < 1200 ? '✓' : '✗'}
        </div>
      )}
      
      {totalTime && totalTime < 1200 && (
        <div className="mb-2 text-xs text-green-600 font-semibold">
          🎯 PERFORMANCE TARGET ACHIEVED!
        </div>
      )}

      {averageTime > 0 && (
        <div className="text-xs text-gray-600 border-t pt-2">
          <div>Average: {averageTime}ms</div>
          <div>Tests: {performanceHistory.length}</div>
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ 
  settings, 
  onSettingsChange, 
  onReset 
}: { 
  settings: VoiceSettings; 
  onSettingsChange: (settings: VoiceSettings) => void;
  onReset: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">⚙️ Settings</h3>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-blue-600 hover:text-blue-800"
        >
          {isOpen ? '▼' : '▶'}
        </button>
      </div>
      
      {isOpen && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">TTS Speed</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.ttsRate}
              onChange={(e) => onSettingsChange({ ...settings, ttsRate: parseFloat(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{settings.ttsRate}x</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">TTS Volume</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={settings.ttsVolume}
              onChange={(e) => onSettingsChange({ ...settings, ttsVolume: parseFloat(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{Math.round(settings.ttsVolume * 100)}%</span>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.enableCaching}
              onChange={(e) => onSettingsChange({ ...settings, enableCaching: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm">Enable API Caching</label>
          </div>
          
          <button
            onClick={onReset}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [whisperStatus, setWhisperStatus] = useState('Initializing...');
  const [ttsStatus, setTtsStatus] = useState('Initializing...');
  const [latency, setLatency] = useState<PerformanceMetrics>({});
  const [performanceHistory, setPerformanceHistory] = useState<number[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    ttsRate: 1.2,
    ttsVolume: 0.8,
    enableCaching: true,
    retryAttempts: 3
  });

  const startTime = useRef<number>(0);
  const sttStartTime = useRef<number>(0);
  const apiStartTime = useRef<number>(0);
  const ttsStartTime = useRef<number>(0);
  const audioRecorder = useRef<AudioRecorder>(new AudioRecorder());
  const whisperWorker = useRef<Worker | null>(null);
  const ttsEngine = useRef<TextToSpeech>(new TextToSpeech());

  const callGemini = async (message: string, attempt: number = 1): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          enableCaching: voiceSettings.enableCaching
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      return data.content;
    } catch (error: any) {
      if (attempt < voiceSettings.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return callGemini(message, attempt + 1);
      }
      
      throw new Error(error.message || 'Failed to get AI response after retries');
    }
  };

  const handleTranscriptComplete = async (text: string) => {
    try {
      setError('');
      setRetryCount(0);
      
      apiStartTime.current = Date.now();
      
      const [apiResponse] = await Promise.all([
        callGemini(text),
        ttsEngine.current.prepare()
      ]);
      
      const apiTime = Date.now() - apiStartTime.current;
      setLatency(prev => ({ ...prev, api: apiTime }));
      setResponse(apiResponse);

      ttsStartTime.current = Date.now();
      
      try {
        if (!ttsEngine.current.isReady()) {
          throw new Error('TTS not ready');
        }
        
        await ttsEngine.current.speak(apiResponse, voiceSettings.ttsRate, voiceSettings.ttsVolume);
        
        const ttsTime = Date.now() - ttsStartTime.current;
        const totalTime = Date.now() - startTime.current;
        
        setLatency(prev => ({ ...prev, tts: ttsTime, total: totalTime }));
        setPerformanceHistory(prev => [...prev.slice(-9), totalTime]);
        
        setIsProcessing(false);
        
      } catch (ttsError: any) {
        setError(`TTS failed: ${ttsError.message}`);
        const totalTime = Date.now() - startTime.current;
        setLatency(prev => ({ ...prev, total: totalTime }));
        setIsProcessing(false);
      }

    } catch (error: any) {
      setError(error.message || 'Failed to process your request.');
      setRetryCount(prev => prev + 1);
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setIsProcessing(true);
      setTranscript('');
      setResponse('');
      setLatency({});
      setError('');
      
      startTime.current = Date.now();
      sttStartTime.current = Date.now();

      await audioRecorder.current.startRecording();
      
    } catch (error: any) {
      setError('Failed to start recording: ' + error.message);
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (isRecording && audioRecorder.current) {
      setIsRecording(false);
      
      try {
        const audioData = audioRecorder.current.stopRecording();
        
        if (audioData.length === 0) {
          setError('No audio data captured. Please try again.');
          setIsProcessing(false);
          return;
        }
        
        whisperWorker.current?.postMessage({ 
          type: 'transcribe', 
          audioData 
        });
        
      } catch (error: any) {
        setError('Failed to process recording: ' + error.message);
        setIsProcessing(false);
      }
    }
  };

  const resetSettings = () => {
    setVoiceSettings({
      ttsRate: 1.2,
      ttsVolume: 0.8,
      enableCaching: true,
      retryAttempts: 3
    });
  };

  useEffect(() => {
    whisperWorker.current = new Worker(new URL('../workers/whisperWorker.ts', import.meta.url));
    
    whisperWorker.current.onmessage = (event) => {
      const { type, text, error, message } = event.data;
      
      switch (type) {
        case 'ready':
          setWhisperStatus('Ready');
          break;
          
        case 'loading':
          setWhisperStatus(message || 'Loading...');
          break;
          
        case 'transcript':
          if (text) {
            setTranscript(text);
            const sttTime = Date.now() - sttStartTime.current;
            setLatency(prev => ({ ...prev, stt: sttTime }));
            handleTranscriptComplete(text);
          }
          break;
          
        case 'error':
          setError(`Speech recognition error: ${error}`);
          setIsProcessing(false);
          setWhisperStatus('Error');
          break;
      }
    };

    whisperWorker.current.postMessage({ type: 'init' });

    setTimeout(() => {
      setTtsStatus(ttsEngine.current.isReady() ? 'Ready' : 'Loading...');
    }, 1000);

    return () => {
      whisperWorker.current?.terminate();
      ttsEngine.current.stop();
    };
  }, []);

  const isSystemReady = whisperStatus === 'Ready' && ttsStatus === 'Ready';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎤 Production Voice Bot</h1>
          <p className="text-lg text-gray-600">
            Enterprise-ready voice chatbot with advanced features
          </p>
          <div className="mt-4 text-sm text-green-600 font-semibold">
            ✅ Production Demo - Optimized, Reliable, User-Friendly
          </div>
          <div className="mt-2 text-sm text-gray-500 space-x-4">
            <span>Whisper: <span className={`font-semibold ${whisperStatus === 'Ready' ? 'text-green-600' : 'text-yellow-600'}`}>
              {whisperStatus}
            </span></span>
            <span>TTS: <span className={`font-semibold ${ttsStatus === 'Ready' ? 'text-green-600' : 'text-yellow-600'}`}>
              {ttsStatus}
            </span></span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="text-center mb-8">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={(isProcessing && !isRecording) || !isSystemReady}
              className={`px-12 py-6 rounded-full text-white font-bold text-xl transition-all transform hover:scale-105 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg' 
                  : isSystemReady
                  ? 'bg-blue-500 hover:bg-blue-600 shadow-lg'
                  : 'bg-gray-400 cursor-not-allowed'
              } ${isProcessing && !isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRecording ? '🛑 Stop Recording' : 
               isSystemReady ? '🎤 Start Recording' : '⏳ Loading...'}
            </button>
            
            {isRecording && (
              <p className="mt-4 text-gray-600 animate-bounce">
                🎙️ Speak now... Click again to stop recording
              </p>
            )}
            
            {!isSystemReady && (
              <p className="mt-4 text-yellow-600">
                🔄 Please wait for systems to initialize...
              </p>
            )}
          </div>

          {transcript && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3 text-gray-800">📝 Your Speech:</h3>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-gray-800">{transcript}</p>
              </div>
            </div>
          )}

          {response && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3 text-gray-800">🤖 AI Response:</h3>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-gray-800">{response}</p>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                🔊 Audio response with {voiceSettings.ttsRate}x speed at {Math.round(voiceSettings.ttsVolume * 100)}% volume
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <strong>❌ Error:</strong> {error}
                {retryCount > 0 && (
                  <div className="mt-2 text-sm">
                    Retry attempts: {retryCount}/{voiceSettings.retryAttempts}
                  </div>
                )}
              </div>
            </div>
          )}

          {isProcessing && !error && (
            <div className="text-center text-gray-600">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing with production optimizations...
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <LatencyPanel 
            sttTime={latency.stt}
            apiTime={latency.api}
            ttsTime={latency.tts}
            totalTime={latency.total}
            performanceHistory={performanceHistory}
          />

          <SettingsPanel
            settings={voiceSettings}
            onSettingsChange={setVoiceSettings}
            onReset={resetSettings}
          />

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold mb-4">🛠️ Production Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span>Enhanced Error Handling</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span>Automatic Retry Logic</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span>Performance Tracking</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span>User Customization</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span>Production Ready</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>🎯 <strong>Production Ready:</strong> Enhanced reliability, user settings, performance tracking</p>
          <p className="mt-2">📝 Click "Start Recording" to experience the production-grade voice bot</p>
          <p className="mt-1">⚙️ Customize settings for your preferred voice interaction experience</p>
        </div>
      </div>
    </div>
  );
}