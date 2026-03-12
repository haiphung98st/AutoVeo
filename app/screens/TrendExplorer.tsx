import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { TrendingUp, Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { trendsApi } from "../services/api";
import type { TrendDto } from "../types/api";

export function TrendExplorer() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState("YouTube");
  const [timeRange, setTimeRange] = useState("7 days");
  const [region, setRegion] = useState("Global");

  const [trends, setTrends] = useState<TrendDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTrends = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await trendsApi.getAll({
        platform: platform === "Google Trends" ? "GoogleTrends" : platform,
        region: region === "Global" ? undefined : region,
      });
      setTrends(response.data);
    } catch (err) {
      setError("Failed to fetch trends. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [platform, region]);

  return (
    <div className="min-h-screen bg-[#0F0F18]">
      <Navigation />

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-semibold mb-2 bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#22D3EE] bg-clip-text text-transparent">
              Trend Explorer
            </h1>
            <p className="text-gray-400">Discover what's trending across platforms</p>
          </div>
          <NeonButton size="sm" variant="outline" icon={RefreshCw} onClick={fetchTrends} disabled={loading}>
            Refresh
          </NeonButton>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <div className="w-80 flex-shrink-0 space-y-5">
            <NeonCard glow glowColor="purple">
              <h3 className="text-lg font-semibold text-white mb-4">Platform</h3>
              <div className="space-y-2">
                {["YouTube", "TikTok", "Google Trends"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`w - full px - 4 py - 3 rounded - xl text - left transition - all duration - 300 ${platform === p
                        ? "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30"
                        : "bg-[#0F0F18] text-gray-400 hover:text-white hover:bg-[#2A2A3E] border border-[#2A2A3E]"
                      } `}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </NeonCard>

            <NeonCard>
              <h3 className="text-lg font-semibold text-white mb-4">Time Range</h3>
              <div className="space-y-2">
                {["Today", "7 days", "30 days"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeRange(t)}
                    className={`w - full px - 4 py - 3 rounded - xl text - left transition - all duration - 300 ${timeRange === t
                        ? "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30"
                        : "bg-[#0F0F18] text-gray-400 hover:text-white hover:bg-[#2A2A3E] border border-[#2A2A3E]"
                      } `}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </NeonCard>

            <NeonCard>
              <h3 className="text-lg font-semibold text-white mb-4">Region</h3>
              <div className="space-y-2">
                {["VN", "US", "Global"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRegion(r)}
                    className={`w - full px - 4 py - 3 rounded - xl text - left transition - all duration - 300 ${region === r
                        ? "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30"
                        : "bg-[#0F0F18] text-gray-400 hover:text-white hover:bg-[#2A2A3E] border border-[#2A2A3E]"
                      } `}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </NeonCard>
          </div>

          {/* Main Trend Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[#171728] rounded-2xl border border-[#2A2A3E]">
                <Loader2 className="w-12 h-12 text-[#A855F7] animate-spin mb-4" />
                <p className="text-gray-400">Loading trending topics...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 bg-red-500/5 rounded-2xl border border-red-500/20">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-red-400 mb-4">{error}</p>
                <NeonButton size="sm" variant="outline" onClick={fetchTrends}>Try Again</NeonButton>
              </div>
            ) : trends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[#171728] rounded-2xl border border-[#2A2A3E]">
                <TrendingUp className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400 mb-2 font-medium">No trends found</p>
                <p className="text-gray-500 text-sm max-w-xs text-center">
                  Try adjusting your filters or check back later once the background collector runs.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {trends.map((trend) => (
                  <div
                    key={trend.id}
                    className="group rounded-2xl overflow-hidden bg-[#171728] border-2 border-[#A855F7]/30 hover:border-[#A855F7] hover:shadow-xl hover:shadow-[#A855F7]/30 transition-all duration-300"
                  >
                    <div className="relative aspect-video overflow-hidden bg-[#0F0F18]">
                      {trend.thumbnailUrl ? (
                        <img
                          src={trend.thumbnailUrl}
                          alt={trend.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                          <TrendingUp className="w-12 h-12 opacity-20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#171728] via-transparent to-transparent opacity-80"></div>
                      <div className="absolute top-3 right-3 bg-[#22D3EE] px-3 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                        <TrendingUp className="w-4 h-4 text-[#0F0F18]" />
                        <span className="text-sm font-semibold text-[#0F0F18]">
                          {trend.deltaPercent}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="mb-4">
                        <h3 className="text-white font-semibold mb-2 line-clamp-2 min-h-[3rem] text-lg">{trend.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className="inline-block px-3 py-1 bg-[#A855F7]/10 text-[#A855F7] text-xs rounded-lg border border-[#A855F7]/30">
                            {trend.category || "General"}
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{trend.platform}</span>
                        </div>
                      </div>
                      <NeonButton
                        size="sm"
                        variant="primary"
                        icon={Sparkles}
                        className="w-full"
                        onClick={() => navigate("/prompt-engine", { state: { trend } })}
                      >
                        Use for Prompt
                      </NeonButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
