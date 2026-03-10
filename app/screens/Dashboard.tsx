import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { Sparkles, TrendingUp, Video, Library, ArrowUp, Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { dashboardApi } from "../services/api";
import type { DashboardDto } from "../types/api";

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await dashboardApi.get();
        setData(response.data);
      } catch (err) {
        setError("Failed to load dashboard data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const trendingSummary = data?.trendingSummary ?? [];
  const recentVideos = data?.recentVideos ?? [];

  return (
    <div className="min-h-screen bg-[#0F0F18]">
      <Navigation />

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-semibold mb-2 bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#22D3EE] bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-400">Welcome back! Here's what's trending today.</p>
        </div>

        {/* Stats Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <NeonCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Videos</p>
                  <p className="text-3xl font-bold text-white">{data.totalVideos}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A855F7]/20 to-[#7C3AED]/20 flex items-center justify-center">
                  <Video className="w-6 h-6 text-[#A855F7]" />
                </div>
              </div>
            </NeonCard>
            <NeonCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Prompts</p>
                  <p className="text-3xl font-bold text-white">{data.totalPrompts}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#22D3EE]/20 to-[#06B6D4]/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#22D3EE]" />
                </div>
              </div>
            </NeonCard>
            <NeonCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending Renders</p>
                  <p className="text-3xl font-bold text-white">{data.pendingRenders}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B]/20 to-[#D97706]/20 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-[#F59E0B]" />
                </div>
              </div>
            </NeonCard>
          </div>
        )}

        {/* Quick Actions */}
        <NeonCard glow glowColor="purple">
          <h2 className="text-2xl font-semibold mb-6 text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <NeonButton
              variant="primary"
              icon={Sparkles}
              onClick={() => navigate("/prompt-engine")}
            >
              Generate Prompt
            </NeonButton>
            <NeonButton
              variant="secondary"
              icon={Video}
              onClick={() => navigate("/render")}
            >
              Generate Video
            </NeonButton>
            <NeonButton
              variant="cyan"
              icon={TrendingUp}
              onClick={() => navigate("/trends")}
            >
              View Trends
            </NeonButton>
          </div>
        </NeonCard>

        {/* Trending Summary */}
        <NeonCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Trending Summary</h2>
            <NeonButton size="sm" variant="outline" onClick={() => navigate("/trends")}>
              View All
            </NeonButton>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#A855F7] animate-spin" />
            </div>
          ) : error ? (
            <p className="text-gray-400 text-center py-8">{error}</p>
          ) : trendingSummary.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No trending data yet. Trends will appear once the collector runs.</p>
          ) : (
            <div className="space-y-3">
              {trendingSummary.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#0F0F18] border border-[#2A2A3E] hover:border-[#A855F7]/30 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A855F7]/20 to-[#7C3AED]/20 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-[#A855F7]/20 transition-all">
                      <ArrowUp className="w-6 h-6 text-[#A855F7]" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{item.title}</h3>
                      <p className="text-sm text-gray-500">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-[#22D3EE]">{item.percent}</p>
                    <p className="text-xs text-gray-500">trending</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeonCard>

        {/* Recent Videos */}
        <NeonCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Recent Videos</h2>
            <NeonButton size="sm" variant="outline" icon={Library} onClick={() => navigate("/library")}>
              Library
            </NeonButton>
          </div>
          {recentVideos.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No videos yet. Generate your first video to see it here!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {recentVideos.map((video) => (
                <div
                  key={video.id}
                  className="group rounded-2xl overflow-hidden bg-[#0F0F18] border border-[#2A2A3E] hover:border-[#A855F7]/50 hover:shadow-lg hover:shadow-[#A855F7]/20 transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-[#A855F7]/10 to-[#22D3EE]/10 flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <Video className="w-12 h-12 text-[#A855F7]/40" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F18] via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-white">
                      {video.duration}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-medium mb-3">{video.title}</h3>
                    <NeonButton size="sm" variant="primary" icon={Download} className="w-full">
                      Download
                    </NeonButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeonCard>
      </div>
    </div>
  );
}