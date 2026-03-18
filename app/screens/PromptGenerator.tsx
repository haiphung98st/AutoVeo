import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { Sparkles, Copy, Wand2, ArrowRight, Video, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { promptsApi } from "../services/api";
import type { TrendDto, PromptResponse } from "../types/api";
import * as XLSX from "xlsx";

export function PromptGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const trend = location.state?.trend as TrendDto | undefined;

  const [character, setCharacter] = useState("");
  const [theme, setTheme] = useState("");
  const [style, setStyle] = useState("Cinematic");
  const [sceneDetail, setSceneDetail] = useState("");
  const [duration] = useState("8s");
  const [platformTarget, setPlatformTarget] = useState("TikTok");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [promptId, setPromptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Series Generation States
  const [isSeriesMode, setIsSeriesMode] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [promptCount, setPromptCount] = useState(3);
  const [seriesResults, setSeriesResults] = useState<PromptResponse[]>([]);
  const [currentSeriesIndex, setCurrentSeriesIndex] = useState(0);

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
      if (isSeriesMode) {
        const response = await promptsApi.generateSeries({
          keyword,
          count: promptCount,
          characterStyle: character,
          visualTheme: theme,
          style,
          duration,
          platformTarget
        });
        setSeriesResults(response.data.prompts);
        setCurrentSeriesIndex(0);
        if (response.data.prompts.length > 0) {
          setGeneratedPrompt(response.data.prompts[0].promptText);
          setPromptId(response.data.prompts[0].id);
        }
      } else {
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
        setSeriesResults([]);
      }
    } catch (err) {
      setError("Failed to generate prompt. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = isSeriesMode
      ? seriesResults.map((p, i) => [`Sample ${i + 1}`, p.promptText])
      : [[theme || "Draft", generatedPrompt]];

    // Add Header
    const wsData = [["Title", "Prompt Content"], ...dataToExport];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [{ wch: 20 }, { wch: 100 }];

    XLSX.utils.book_append_sheet(wb, ws, "Prompts");
    XLSX.writeFile(wb, `autoveo_prompts_${new Date().toISOString().split('T')[0]}.xlsx`);
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

            <div className="mb-6 flex p-1 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl">
              <button
                onClick={() => setIsSeriesMode(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isSeriesMode ? "bg-[#A855F7] text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
              >
                Single Prompt
              </button>
              <button
                onClick={() => setIsSeriesMode(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isSeriesMode ? "bg-[#A855F7] text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
              >
                Generate Series (AI)
              </button>
            </div>

            <div className="space-y-5">
              {isSeriesMode && (
                <div>
                  <label className="block text-white mb-2 font-medium text-sm">Target Keyword / Topic</label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g., Space exploration, Cyberpunk city"
                    className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all font-light"
                  />
                </div>
              )}

              <div>
                <label className="block text-white mb-2 font-medium">Character {isSeriesMode && <span className="text-gray-500 text-xs">(Fixed Description)</span>}</label>
                <input
                  type="text"
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  placeholder="e.g., A futuristic cyborg warrior"
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all font-light"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Theme {isSeriesMode && <span className="text-gray-500 text-xs">(Fixed Background)</span>}</label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g., Cyberpunk adventure"
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all font-light"
                />
              </div>

              {!isSeriesMode && (
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
              )}

              {isSeriesMode && (
                <div>
                  <label className="block text-white mb-2 font-medium text-sm">Number of Prompts (Consistent Series)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="2"
                      max="10"
                      value={promptCount}
                      onChange={(e) => setPromptCount(parseInt(e.target.value))}
                      className="flex-1 accent-[#A855F7]"
                    />
                    <span className="w-12 text-center py-2 bg-[#0F0F18] border border-[#2A2A3E] rounded-lg text-white font-mono">{promptCount}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-5">
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

              <div className="flex-1 bg-[#0F0F18] border-2 border-[#22D3EE]/30 rounded-2xl p-6 font-mono text-sm overflow-auto mb-5 scrollbar-hide relative">
                {isSeriesMode && seriesResults.length > 0 && (
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-[#22D3EE]/10 text-[#22D3EE] text-[10px] rounded-full border border-[#22D3EE]/30">
                      Sample {currentSeriesIndex + 1} / {seriesResults.length}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[8px] uppercase tracking-wider rounded border border-purple-500/20">
                      Character & Theme Fixed
                    </span>
                  </div>
                )}

                {generatedPrompt ? (
                  <div className="space-y-4">
                    <p className="text-[#22D3EE] leading-relaxed whitespace-pre-wrap">{generatedPrompt}</p>
                    {isSeriesMode && seriesResults.length > 1 && (
                      <div className="pt-4 border-t border-[#22D3EE]/20 flex justify-between items-center">
                        <button
                          onClick={() => {
                            const next = (currentSeriesIndex - 1 + seriesResults.length) % seriesResults.length;
                            setCurrentSeriesIndex(next);
                            setGeneratedPrompt(seriesResults[next].promptText);
                            setPromptId(seriesResults[next].id);
                          }}
                          className="text-[#22D3EE] hover:text-white text-xs"
                        >
                          &larr; Previous
                        </button>
                        <button
                          onClick={() => {
                            const next = (currentSeriesIndex + 1) % seriesResults.length;
                            setCurrentSeriesIndex(next);
                            setGeneratedPrompt(seriesResults[next].promptText);
                            setPromptId(seriesResults[next].id);
                          }}
                          className="text-[#22D3EE] hover:text-white text-xs"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p className="italic">Your generated prompt will appear here after clicking "Generate Prompt"</p>
                  </div>
                )}
              </div>

              {generatedPrompt && (
                <div className="space-y-3 mt-auto">
                  <div className="flex gap-4">
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
                      onClick={() => {
                        if (isSeriesMode && seriesResults.length > 0) {
                          navigate("/render", {
                            state: {
                              prompts: seriesResults.map((p, idx) => ({
                                id: p.id,
                                title: `Scene ${idx + 1}`,
                                promptText: p.promptText
                              }))
                            }
                          });
                        } else {
                          navigate("/render", { state: { promptText: generatedPrompt, promptId } });
                        }
                      }}
                    >
                      Send to Render
                    </NeonButton>
                  </div>
                  <NeonButton
                    variant="outline"
                    icon={FileSpreadsheet}
                    className="w-full bg-green-600/10 text-green-400 border-green-500/30 hover:bg-green-600/20"
                    onClick={handleExportExcel}
                  >
                    Download Series as Excel
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
