import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { Play, Download, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { renderApi, videosApi } from "../services/api";

export function VideoRender() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialPrompt = location.state?.promptText || "";
  const initialPromptId = location.state?.promptId || "";

  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [styleOverride, setStyleOverride] = useState("");
  const [status, setStatus] = useState<string>("idle"); // idle, submitting, rendering, completed, failed
  const [logs, setLogs] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [renderRequestId, setRenderRequestId] = useState<string>("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const pollingInterval = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const startPolling = (id: string) => {
    setStatus("rendering");
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await renderApi.getStatus(id);
        const data = response.data;

        setLogs(data.logs || []);

        if (data.status === "Completed") {
          setStatus("completed");
          setVideoUrl(data.videoUrl || "");
          if (pollingInterval.current) clearInterval(pollingInterval.current);
        } else if (data.status === "Failed") {
          setStatus("failed");
          setError(data.errorMessage || "Render failed on the server.");
          if (pollingInterval.current) clearInterval(pollingInterval.current);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000); // Poll every 3 seconds
  };

  const handleRender = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt first.");
      return;
    }

    setStatus("submitting");
    setError("");
    setLogs(["Submitting render request to AutoVeo engine..."]);

    try {
      const response = await renderApi.submit({
        promptId: initialPromptId || undefined,
        promptText: prompt,
        aspectRatio,
        styleOverride: styleOverride || undefined
      });

      const requestId = response.data.renderRequestId;
      setRenderRequestId(requestId);
      startPolling(requestId);
    } catch (err) {
      setStatus("failed");
      setError("Failed to submit render request. Please check your connection.");
      console.error(err);
    }
  };

  const handleSaveToLibrary = async () => {
    if (status !== "completed" || !renderRequestId) return;

    setIsSaving(true);
    try {
      await videosApi.save({
        renderResultId: renderRequestId,
        title: prompt.substring(0, 50) + "...",
        promptText: prompt,
        style: styleOverride || "Default",
        tags: []
      });
      navigate("/library");
    } catch (err) {
      console.error("Failed to save video:", err);
      alert("Failed to save video to library.");
    } finally {
      setIsSaving(false);
    }
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
                  <label className="block text-white mb-2 font-medium">Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your video generation prompt here..."
                    rows={6}
                    disabled={status === "submitting" || status === "rendering"}
                    className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all resize-none font-light disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 font-medium">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["9:16", "16:9", "1:1"].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        disabled={status === "submitting" || status === "rendering"}
                        className={`px-4 py-3 rounded-xl transition-all duration-300 font-medium ${aspectRatio === ratio
                          ? "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30"
                          : "bg-[#0F0F18] text-gray-400 border border-[#2A2A3E] hover:border-[#A855F7]/50"
                          } disabled:opacity-50`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white mb-2 font-medium">Style Override (Optional)</label>
                  <input
                    type="text"
                    value={styleOverride}
                    onChange={(e) => setStyleOverride(e.target.value)}
                    disabled={status === "submitting" || status === "rendering"}
                    placeholder="e.g., More vibrant colors, slower pace"
                    className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all font-light disabled:opacity-50"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <NeonButton
                  variant="primary"
                  icon={status === "submitting" || status === "rendering" ? Loader2 : Play}
                  className="w-full"
                  size="lg"
                  onClick={handleRender}
                  disabled={status === "submitting" || status === "rendering"}
                >
                  {status === "submitting" ? "Submitting..." :
                    status === "rendering" ? "Rendering in Progress..." :
                      "Render with Veo3"}
                </NeonButton>
              </div>
            </NeonCard>
          </div>

          {/* Right Panel - Logs & Preview */}
          <div className="space-y-5">
            {/* Terminal Logs */}
            <NeonCard glow glowColor="cyan">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center justify-between">
                Render Logs
                {status === "rendering" && <Loader2 className="w-5 h-5 animate-spin text-[#22D3EE]" />}
                {status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-400" />}
              </h2>
              <div className="bg-[#0F0F18] border-2 border-[#22D3EE]/30 rounded-2xl p-6 h-64 overflow-y-auto font-mono text-sm scrollbar-hide">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <p key={index} className="text-[#22D3EE] mb-1">
                      {log}
                    </p>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center opacity-40">
                    <p className="italic">Render logs will appear here during processing</p>
                  </div>
                )}
              </div>
            </NeonCard>

            {/* Video Preview */}
            <NeonCard className="border-2 border-[#A855F7]/30">
              <h2 className="text-2xl font-semibold text-white mb-4">Video Preview</h2>
              <div
                className={`rounded-2xl overflow-hidden border-2 border-[#A855F7] shadow-xl shadow-[#A855F7]/30 bg-[#0F0F18] relative ${aspectRatio === "9:16" ? "aspect-[9/16] max-w-[300px] mx-auto" :
                  aspectRatio === "16:9" ? "aspect-video" :
                    "aspect-square max-w-[400px] mx-auto"
                  }`}
              >
                {status === "completed" && videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                  />
                ) : status === "rendering" || status === "submitting" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#171728]">
                    <div className="relative w-20 h-20 mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-[#A855F7]/20 border-t-[#A855F7] animate-spin"></div>
                      <Play className="absolute inset-0 m-auto w-8 h-8 text-[#A855F7] opacity-50" />
                    </div>
                    <p className="text-gray-400 text-sm animate-pulse">Polishing frames...</p>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-center p-10">
                    <div>
                      <Play className="w-16 h-16 text-gray-700 mx-auto mb-4 opacity-20" />
                      <p className="text-gray-500 italic text-sm">Preview will appear after rendering completes</p>
                    </div>
                  </div>
                )}
              </div>

              {status === "completed" && (
                <div className="flex gap-4 mt-8">
                  <NeonButton
                    variant="outline"
                    icon={Download}
                    className="flex-1"
                    onClick={() => window.open(videoUrl, "_blank")}
                  >
                    Download
                  </NeonButton>
                  <NeonButton
                    variant="primary"
                    icon={isSaving ? Loader2 : Save}
                    className="flex-1"
                    onClick={handleSaveToLibrary}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save to Library"}
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
