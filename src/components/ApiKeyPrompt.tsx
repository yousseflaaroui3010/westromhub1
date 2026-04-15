import { useState, useEffect } from 'react';
import { Key } from 'lucide-react';

export function ApiKeyPrompt({ onKeySelected }: { onKeySelected: () => void }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
        if (selected) {
          onKeySelected();
        }
      } else {
        // Fallback if not in AI Studio environment
        setHasKey(true);
        onKeySelected();
      }
    };
    checkKey();
  }, [onKeySelected]);

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      if (window.aistudio && window.aistudio.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Assume success to mitigate race condition
        setHasKey(true);
        onKeySelected();
      }
    } catch (error) {
      console.error("Failed to select API key", error);
      // Reset state if "Requested entity was not found."
      if (error instanceof Error && error.message.includes("Requested entity was not found.")) {
        setHasKey(false);
      }
    }
  };

  if (hasKey === null) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  if (hasKey) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
          <Key className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">API Key Required</h2>
        <p className="text-gray-600 mb-6">
          To use the advanced AI analysis features (powered by Gemini 3.1 Pro), you need to select a valid Google Cloud API key with billing enabled.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Learn more about Gemini API billing
          </a>
        </p>
        <button
          onClick={handleSelectKey}
          className="w-full bg-primary hover:bg-primary-container text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Select API Key
        </button>
      </div>
    </div>
  );
}
