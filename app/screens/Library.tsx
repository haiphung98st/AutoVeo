import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { Search, Download, Copy, Eye, Trash2, Loader2, PlayCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { videosApi } from "../services/api";
import type { VideoDto } from "../types/api";

export function Library() {
  const [searchQuery, setSearchQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");

  const [videos, setVideos] = useState<VideoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchVideos = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await videosApi.getAll({
        search: searchQuery || undefined,
        style: styleFilter === "All" ? undefined : styleFilter,
        dateRange: dateFilter === "All Time" ? undefined : dateFilter,
      });
      setVideos(response.data);
    } catch (err) {
      setError("Failed to load your library.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVideos();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, styleFilter, dateFilter]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this video from your library?")) return;

    try {
      await videosApi.delete(id);
      setVideos(videos.filter(v => v.id !== id));
    } catch (err) {
      console.error("Failed to delete video:", err);
      alert("Failed to delete video.");
    }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
  };

  return (
    <div className="min-h-screen bg-[#0F0F18]">
      <Navigation />

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-semibold mb-2 bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#22D3EE] bg-clip-text text-transparent">
              Library
            </h1>
            <p className="text-gray-400">Your collection of generated videos</p>
          </div>
          <p className="text-sm text-gray-500 font-medium">Total: {videos.length} videos</p>
        </div>

        {/* Filters */}
        <NeonCard glow glowColor="purple" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Search Bar */}
            <div className="md:col-span-2">
              <label className="block text-white mb-2 font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or prompt..."
                  className="w-full pl-12 pr-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all font-light"
                />
              </div>
            </div>

            {/* Style Filter */}
            <div>
              <label className="block text-white mb-2 font-medium">Style</label>
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all cursor-pointer"
              >
                {["All", "Cinematic", "Anime", "Realistic", "Abstract", "Neon Cyberpunk", "Retro", "Minimalist"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-white mb-2 font-medium">Date</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all cursor-pointer"
              >
                {["All Time", "Today", "This Week", "This Month"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </NeonCard>

        {/* Main Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-[#171728] rounded-2xl border border-[#2A2A3E]">
            <Loader2 className="w-12 h-12 text-[#A855F7] animate-spin mb-4" />
            <p className="text-gray-400">Loading your library...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 bg-red-500/5 rounded-2xl border border-red-500/20">
            <p className="text-red-400 mb-4">{error}</p>
            <NeonButton size="sm" variant="outline" onClick={fetchVideos}>Retry</NeonButton>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-[#171728] rounded-2xl border border-[#2A2A3E]">
            <PlayCircle className="w-16 h-16 text-gray-700 mb-4 opacity-20" />
            <p className="text-gray-400 mb-2 font-medium">No videos found</p>
            <p className="text-gray-500 text-sm">Start generating and save your creations here!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="group rounded-2xl overflow-hidden bg-[#171728] border-2 border-[#2A2A3E] hover:border-[#A855F7] hover:shadow-xl hover:shadow-[#A855F7]/30 transition-all duration-300"
              >
                <div className="relative aspect-video overflow-hidden bg-[#0F0F18]">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-800">
                      <PlayCircle className="w-12 h-12 opacity-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#171728] via-transparent to-transparent opacity-80"></div>
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-lg text-xs text-white font-medium">
                    {video.duration}
                  </div>
                  <button
                    onClick={() => window.open(video.videoUrl, "_blank")}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#A855F7]/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 shadow-lg"
                  >
                    <Eye className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-5">
                  <h3 className="text-white font-semibold mb-1 truncate">{video.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2 italic h-[2.5rem]">
                    {video.promptText}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-2 py-0.5 bg-[#A855F7]/10 text-[#A855F7] text-[10px] uppercase tracking-wider rounded border border-[#A855F7]/30">
                      {video.style}
                    </span>
                    {video.tags && video.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[#22D3EE]/10 text-[#22D3EE] text-[10px] uppercase tracking-wider rounded border border-[#22D3EE]/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <NeonButton
                      size="sm"
                      variant="outline"
                      icon={Download}
                      title="Download"
                      onClick={() => window.open(video.videoUrl, "_blank")}
                    />
                    <NeonButton
                      size="sm"
                      variant="outline"
                      icon={Copy}
                      title="Copy Prompt"
                      onClick={() => handleCopyPrompt(video.promptText)}
                    />
                    <NeonButton
                      size="sm"
                      variant="outline"
                      icon={Eye}
                      title="View Detail"
                      onClick={() => window.open(video.videoUrl, "_blank")}
                    />
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="flex items-center justify-center p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all font-medium"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
