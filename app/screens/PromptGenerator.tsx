import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { Sparkles, Copy, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { promptsApi } from "../services/api";
import type { TrendDto } from "../types/api";

export function PromptGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const trend = location.state?.trend as TrendDto | undefined;

  const [character, setCharacter] = useState("");
  const [theme, setTheme] = useState("");
  const [style, setStyle] = useState("Cinematic");
  const [sceneDetail, setSceneDetail] = useState("");
  const [duration, setDuration] = useState("10s");
  const [platformTarget, setPlatformTarget] = useState("TikTok");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [promptId, setPromptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (trend) {
      setTheme(trend.title);
      setSceneDetail(`Inspired by the trending topic: ${trend.title} (${trend.category})`);
    }
  }, [trend]);

  const styles = ["Cinematic", "Anime", "Realistic", "Abstract", "Neon Cyberpunk", "Retro", "Minimalist"];

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await promptsApi.generate({
        character,
        theme,
        style,
        sceneDetail,
        duration,
        platformTarget,
        sourceTrendId: trend?.id
      });
      setGeneratedPrompt(response.data.promptText);
      setPromptId(response.data.id);
    } catch (err) {
      setError("Failed to generate prompt. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedPrompt) {
      navigator.clipboard.writeText(generatedPrompt);
    }
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
          {trend && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#A855F7]/10 border border-[#A855F7]/30 rounded-xl w-fit">
              <Sparkles className="w-4 h-4 text-[#A855F7]" />
              <span className="text-sm text-white">Using Trend: <span className="text-[#A855F7] font-medium">{trend.title}</span></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Form */}
          <NeonCard glow glowColor="purple">
            <h2 className="text-2xl font-semibold text-white mb-6">Prompt Settings</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-white mb-2 font-medium">Character</label>
                <input
                  type="text"
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  placeholder="e.g., A futuristic cyborg warrior"
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all font-light"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Theme</label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g., Cyberpunk adventure"
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all font-light"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all cursor-pointer"
                >
                  {styles.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Scene Detail</label>
                <textarea
                  value={sceneDetail}
                  onChange={(e) => setSceneDetail(e.target.value)}
                  placeholder="Describe the scene in detail..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all resize-none font-light"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-white mb-2 font-medium">Duration</label>
                  <div className="flex gap-2">
                    {["5s", "10s", "20s"].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`flex-1 px-3 py-2.5 rounded-xl transition-all duration-300 text-sm font-medium ${duration === d
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
                  <label className="block text-white mb-2 font-medium">Platform</label>
                  <div className="flex gap-2">
                    {["TikTok", "YouTube Shorts"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlatformTarget(p)}
                        className={`flex-1 px-3 py-2.5 rounded-xl transition-all duration-300 text-sm font-medium ${platformTarget === p
                            ? "bg-[#22D3EE] text-[#0F0F18] shadow-lg shadow-[#22D3EE]/30"
                            : "bg-[#0F0F18] text-gray-400 border border-[#2A2A3E] hover:border-[#22D3EE]/50"
                          }`}
                      >
                        {p === "YouTube Shorts" ? "Shorts" : p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <NeonButton
                variant="primary"
                icon={Sparkles}
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Prompt"}
              </NeonButton>
            </div>
          </NeonCard>

          {/* Right Panel - Preview */}
          <div className="space-y-5">
            <NeonCard glow glowColor="cyan" className="h-[600px] flex flex-col">
              <h2 className="text-2xl font-semibold text-white mb-4">Generated Prompt</h2>

              <div className="flex-1 bg-[#0F0F18] border-2 border-[#22D3EE]/30 rounded-2xl p-6 font-mono text-sm overflow-auto mb-5 scrollbar-hide">
                {generatedPrompt ? (
                  <p className="text-[#22D3EE] leading-relaxed whitespace-pre-wrap">{generatedPrompt}</p>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p className="italic">Your generated prompt will appear here after clicking "Generate Prompt"</p>
                  </div>
                )}
              </div>

              {generatedPrompt && (
                <div className="flex gap-4 mt-auto">
                  <NeonButton
                    variant="cyan"
                    icon={Copy}
                    className="flex-1"
                    onClick={handleCopy}
                  >
                    Copy
                  </NeonButton>
                  <NeonButton
                    variant="primary"
                    icon={ArrowRight}
                    className="flex-1"
                    onClick={() => navigate("/render", { state: { promptText: generatedPrompt, promptId } })}
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
