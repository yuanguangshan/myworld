
import React, { useState } from 'react';
import { analyzeWorldInspiration, generateVoxelConcept } from '../services/geminiService';

interface GeminiPanelProps {
  onClose: () => void;
}

export const GeminiPanel: React.FC<GeminiPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate'>('analyze');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setImagePreview(reader.result as string);
      setLoading(true);
      const analysis = await analyzeWorldInspiration(base64);
      setResult(analysis);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    const imageUrl = await generateVoxelConcept(prompt);
    setResult(imageUrl);
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-xl">🤖</div>
            <div>
              <h2 className="text-xl font-bold">Gemini AI Tools</h2>
              <p className="text-sm text-gray-400">Power your creativity with AI</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button 
            onClick={() => { setActiveTab('analyze'); setResult(null); }}
            className={`px-8 py-4 font-bold transition-all ${activeTab === 'analyze' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-white'}`}
          >
            Analyze Inspiration
          </button>
          <button 
            onClick={() => { setActiveTab('generate'); setResult(null); }}
            className={`px-8 py-4 font-bold transition-all ${activeTab === 'generate' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-white'}`}
          >
            Generate Concept
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'analyze' ? (
            <div className="space-y-6">
              <div className="bg-gray-800/50 p-6 rounded-xl border border-dashed border-white/20 text-center">
                <p className="text-gray-300 mb-4">Upload a photo to see how it looks in voxel style</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  className="hidden" 
                  id="voxel-upload"
                />
                <label 
                  htmlFor="voxel-upload"
                  className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  Choose Image
                </label>
              </div>

              {loading && <div className="text-center py-10 animate-pulse text-blue-400">Analyzing patterns...</div>}
              
              {!loading && result && activeTab === 'analyze' && (
                <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {imagePreview && <img src={imagePreview} className="rounded-xl w-full aspect-video object-cover border border-white/10" alt="Preview" />}
                  <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <h3 className="text-blue-400 font-bold mb-3 uppercase tracking-wider text-sm">Gemini Insight</h3>
                    <p className="text-gray-200 leading-relaxed italic">{result}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-4">
                <input 
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe a castle, a futuristic city, or a forest..."
                  className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-400"
                />
                <button 
                  onClick={handleGenerate}
                  disabled={loading || !prompt}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-bold transition-colors"
                >
                  Generate
                </button>
              </div>

              {loading && <div className="text-center py-10 animate-pulse text-purple-400">Dreaming up voxels...</div>}

              {!loading && result && activeTab === 'generate' && (
                <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                  <img src={result} className="rounded-xl max-h-96 border border-white/10 shadow-2xl" alt="Generated Concept" />
                  <p className="text-center text-gray-400 text-sm max-w-lg italic">
                    Use this as a reference for your next build in the world!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-black/20 text-center text-[10px] text-gray-600 uppercase tracking-widest border-t border-white/5">
          Powered by Google Gemini 3 Pro & 2.5 Flash
        </div>
      </div>
    </div>
  );
};
