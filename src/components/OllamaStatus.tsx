import { useCallback, useEffect, useState } from 'react';
import { ServerOff } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const VISION_MODEL = 'qwen2-vl:7b';
const TEXT_MODEL = 'qwen2.5:7b';

type Status = 'checking' | 'ready' | 'offline' | 'missing_models';

export function OllamaStatus({ onReady }: { onReady: () => void }) {
  const [status, setStatus] = useState<Status>('checking');
  const [missingModels, setMissingModels] = useState<string[]>([]);

  const check = useCallback(async () => {
    setStatus('checking');
    try {
      const res = await fetch(API_BASE_URL + '/tags', {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = (await res.json()) as { models?: Array<{ name: string }> };
        const models = data.models?.map((m) => m.name) ?? [];
        const required = [VISION_MODEL, TEXT_MODEL];
        const missing = required.filter(m => !models.some(name => name.startsWith(m) || name.startsWith(m.split(':')[0])));

        if (missing.length > 0) {
          setMissingModels(missing);
          setStatus('missing_models');
        } else {
          setStatus('ready');
          onReady();
        }
      } else {
        setStatus('offline');
      }
    } catch {
      setStatus('offline');
    }
  }, [onReady]);

  useEffect(() => { void check(); }, [check]);

  if (status === 'ready') return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        {status === 'checking' ? (
          <>
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-gray-600 font-medium">Connecting to Ollama…</p>
          </>
        ) : status === 'missing_models' ? (
          <>
            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500">
              <ServerOff className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Models Missing</h2>
            <p className="text-gray-500 mb-6 text-sm">
              The required AI models are not downloaded. Please run:
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
              {missingModels.map(m => (
                <code key={m} className="block text-sm text-gray-800">ollama pull {m}</code>
              ))}
            </div>
            <button
              onClick={() => void check()}
              className="w-full bg-primary text-white py-3 px-6 rounded-xl font-semibold hover:bg-primary-container transition-colors"
            >
              Check Again
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <ServerOff className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Ollama Not Running</h2>
            <p className="text-gray-500 mb-6 text-sm">
              This app runs AI analysis locally via Ollama. Make sure Ollama is installed,
              the models are pulled, and the server is running.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left text-sm font-mono space-y-2">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Setup commands</p>
              <p className="text-gray-500"># 1. Install Ollama</p>
              <p className="text-primary select-all">https://ollama.com/download</p>
              <p className="text-gray-500 mt-2"># 2. Pull models</p>
              <p className="text-primary select-all">ollama pull {VISION_MODEL}</p>
              <p className="text-primary select-all">ollama pull {TEXT_MODEL}</p>
              <p className="text-gray-500 mt-2"># 3. Start (runs automatically after install)</p>
              <p className="text-primary select-all">ollama serve</p>
            </div>

            <p className="text-xs text-gray-400 mb-6">
              Connecting to: <span className="font-mono text-gray-600">{API_BASE_URL}</span>
            </p>

            <button
              onClick={() => { void check(); }}
              className="w-full bg-primary hover:bg-primary-container text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Retry Connection
            </button>
          </>
        )}
      </div>
    </div>
  );
}
