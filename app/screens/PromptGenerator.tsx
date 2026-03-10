import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { Sparkles, Copy, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export function PromptGenerator() {
  const navigate = useNavigate();
  const [character, setCharacter] = useState("");
  const [theme, setTheme] = useState("");
  const [style, setStyle] = useState("Cinematic");
  const [sceneDetail, setSceneDetail] = useState("");
  const [duration, setDuration] = useState("10s");
  const [platformTarget, setPlatformTarget] = useState("TikTok");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  
  const styles = ["Cinematic", "Anime", "Realistic", "Abstract", "Neon Cyberpunk", "Retro", "Minimalist"];
  
  const handleGenerate = () => {
    const prompt = `Create a ${duration} ${style.toLowerCase()} video featuring ${character || "a mysterious character"}. Theme: ${theme || "futuristic adventure"}. Scene: ${sceneDetail || "dynamic action sequence with vibrant colors"}. Optimized for ${platformTarget} vertical format with engaging visual effects and smooth transitions.`;
    setGeneratedPrompt(prompt);
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
  };
  
  return (
    <div className="min-h-screen bg-[#0F0F18]">
      <Navigation />
      
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold mb-2 bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#22D3EE] bg-clip-text text-transparent">
            Prompt Generator
          </h1>
          <p className="text-gray-400">Create AI video generation prompts tailored to your needs</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Form */}
          <NeonCard glow glowColor="purple">
            <h2 className="text-2xl font-semibold text-white mb-6">Prompt Settings</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-white mb-2">Character</label>
                <input
                  type="text"
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  placeholder="e.g., A futuristic cyborg warrior"
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Theme</label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g., Cyberpunk adventure"
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all"
                >
                  {styles.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-white mb-2">Scene Detail</label>
                <textarea
                  value={sceneDetail}
                  onChange={(e) => setSceneDetail(e.target.value)}
                  placeholder="Describe the scene in detail..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all resize-none"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Duration</label>
                <div className="flex gap-3">
                  {["5s", "10s", "20s"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex-1 px-4 py-3 rounded-xl transition-all duration-300 ${
                        duration === d
                          ? "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30"
                          : "bg-[#0F0F18] text-gray-400 border border-[#2A2A3E] hover:border-[#A855F7]/50"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-white mb-2">Platform</label>
                <div className="flex gap-3">
                  {["TikTok", "YouTube Shorts"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatformTarget(p)}
                      className={`flex-1 px-4 py-3 rounded-xl transition-all duration-300 ${
                        platformTarget === p
                          ? "bg-[#22D3EE] text-[#0F0F18] shadow-lg shadow-[#22D3EE]/30"
                          : "bg-[#0F0F18] text-gray-400 border border-[#2A2A3E] hover:border-[#22D3EE]/50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              
              <NeonButton 
                variant="primary" 
                icon={Sparkles} 
                className="w-full" 
                size="lg"
                onClick={handleGenerate}
              >
                Generate Prompt
              </NeonButton>
            </div>
          </NeonCard>
          
          {/* Right Panel - Preview */}
          <div className="space-y-5">
            <NeonCard glow glowColor="cyan" className="h-full">
              <h2 className="text-2xl font-semibold text-white mb-4">Generated Prompt</h2>
              
              <div className="bg-[#0F0F18] border-2 border-[#22D3EE]/30 rounded-2xl p-6 min-h-[400px] font-mono text-sm">
                {generatedPrompt ? (
                  <p className="text-[#22D3EE] leading-relaxed">{generatedPrompt}</p>
                ) : (
                  <p className="text-gray-500 italic">Your generated prompt will appear here...</p>
                )}
              </div>
              
              {generatedPrompt && (
                <div className="flex gap-3 mt-5">
                  <NeonButton 
                    variant="cyan" 
                    icon={Copy} 
                    className="flex-1"
                    onClick={handleCopy}
                  >
                    Copy Prompt
                  </NeonButton>
                  <NeonButton 
                    variant="primary" 
                    icon={ArrowRight} 
                    className="flex-1"
                    onClick={() => navigate("/render")}
                  >
                    Send to Render
                  </NeonButton>
                </div>
              )}
            </NeonCard>
          </div>
        </div>
      </div>
    </div>
  );
}
