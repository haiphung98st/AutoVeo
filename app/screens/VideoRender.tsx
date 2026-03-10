import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { Play, Download, Save } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export function VideoRender() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [styleOverride, setStyleOverride] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [renderComplete, setRenderComplete] = useState(false);
  
  const handleRender = () => {
    setIsRendering(true);
    setRenderComplete(false);
    setLogs([]);
    
    const renderLogs = [
      "[00:00] Initializing Veo3 engine...",
      "[00:02] Loading AI models...",
      "[00:05] Analyzing prompt...",
      "[00:08] Generating keyframes...",
      "[00:12] Applying style transformations...",
      "[00:18] Rendering video sequences...",
      "[00:25] Processing visual effects...",
      "[00:32] Optimizing for " + aspectRatio + " format...",
      "[00:38] Finalizing output...",
      "[00:42] ✓ Render complete!",
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < renderLogs.length) {
        setLogs((prev) => [...prev, renderLogs[index]]);
        index++;
      } else {
        clearInterval(interval);
        setIsRendering(false);
        setRenderComplete(true);
      }
    }, 800);
  };
  
  return (
    <div className="min-h-screen bg-[#0F0F18]">
      <Navigation />
      
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold mb-2 bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#22D3EE] bg-clip-text text-transparent">
            Video Render
          </h1>
          <p className="text-gray-400">Generate stunning videos with Veo3 AI engine</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Settings */}
          <div className="space-y-5">
            <NeonCard glow glowColor="purple">
              <h2 className="text-2xl font-semibold text-white mb-6">Render Settings</h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-white mb-2">Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your video generation prompt here..."
                    rows={6}
                    className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["9:16", "16:9", "1:1"].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`px-4 py-3 rounded-xl transition-all duration-300 ${
                          aspectRatio === ratio
                            ? "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30"
                            : "bg-[#0F0F18] text-gray-400 border border-[#2A2A3E] hover:border-[#A855F7]/50"
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-white mb-2">Style Override (Optional)</label>
                  <input
                    type="text"
                    value={styleOverride}
                    onChange={(e) => setStyleOverride(e.target.value)}
                    placeholder="e.g., More vibrant colors, slower pace"
                    className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all"
                  />
                </div>
                
                <NeonButton 
                  variant="primary" 
                  icon={Play} 
                  className="w-full" 
                  size="lg"
                  onClick={handleRender}
                >
                  {isRendering ? "Rendering..." : "Render with Veo3"}
                </NeonButton>
              </div>
            </NeonCard>
          </div>
          
          {/* Right Panel - Logs & Preview */}
          <div className="space-y-5">
            {/* Terminal Logs */}
            <NeonCard glow glowColor="cyan">
              <h2 className="text-2xl font-semibold text-white mb-4">Render Logs</h2>
              <div className="bg-[#0F0F18] border-2 border-[#22D3EE]/30 rounded-2xl p-6 h-64 overflow-y-auto font-mono text-sm">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <p key={index} className="text-[#22D3EE] mb-1">
                      {log}
                    </p>
                  ))
                ) : (
                  <p className="text-gray-500 italic">Render logs will appear here...</p>
                )}
              </div>
            </NeonCard>
            
            {/* Video Preview */}
            <NeonCard className="border-2 border-[#A855F7]/30">
              <h2 className="text-2xl font-semibold text-white mb-4">Video Preview</h2>
              <div 
                className={`rounded-2xl overflow-hidden border-2 border-[#A855F7] shadow-xl shadow-[#A855F7]/30 bg-[#0F0F18] ${
                  aspectRatio === "9:16" ? "aspect-[9/16] max-w-[300px] mx-auto" :
                  aspectRatio === "16:9" ? "aspect-video" :
                  "aspect-square max-w-[400px] mx-auto"
                }`}
              >
                {renderComplete ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#A855F7]/20 via-[#7C3AED]/20 to-[#22D3EE]/20">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#A855F7] to-[#22D3EE] flex items-center justify-center">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                      <p className="text-white font-medium">Video Ready!</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-gray-500 italic">Preview will appear after rendering</p>
                  </div>
                )}
              </div>
              
              {renderComplete && (
                <div className="flex gap-3 mt-5">
                  <NeonButton 
                    variant="primary" 
                    icon={Download} 
                    className="flex-1"
                  >
                    Download Video
                  </NeonButton>
                  <NeonButton 
                    variant="cyan" 
                    icon={Save} 
                    className="flex-1"
                    onClick={() => navigate("/library")}
                  >
                    Save to Library
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
