import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { Search, Download, Copy, Eye } from "lucide-react";
import { useState } from "react";

export function Library() {
  const [searchQuery, setSearchQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState("All");
  const [characterFilter, setCharacterFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  
  const videos = [
    {
      id: 1,
      thumbnail: "https://images.unsplash.com/photo-1613723984367-a9b7ee9052d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZW9uJTIwY2l0eSUyMGxpZ2h0cyUyMG5pZ2h0fGVufDF8fHx8MTc3MzEyMDcxMXww&ixlib=rb-4.1.0&q=80&w=1080",
      prompt: "Neon city lights at night with cyberpunk aesthetics",
      tags: ["Cyberpunk", "Urban", "Night"],
      style: "Neon Cyberpunk",
      duration: "0:15"
    },
    {
      id: 2,
      thumbnail: "https://images.unsplash.com/photo-1736175549681-c24c552da1e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwYXJ0JTIwY29sb3JmdWx8ZW58MXx8fHwxNzczMDkzOTMxfDA&ixlib=rb-4.1.0&q=80&w=1080",
      prompt: "Colorful digital art with dynamic shapes and patterns",
      tags: ["Abstract", "Colorful", "Digital"],
      style: "Abstract",
      duration: "0:10"
    },
    {
      id: 3,
      thumbnail: "https://images.unsplash.com/photo-1761645502916-668a34914b6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMHBhcnRpY2xlcyUyMG1vdGlvbnxlbnwxfHx8fDE3NzMxMjQ0MjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
      prompt: "Abstract particles in motion with fluid dynamics",
      tags: ["Particles", "Motion", "Abstract"],
      style: "Abstract",
      duration: "0:20"
    },
    {
      id: 4,
      thumbnail: "https://images.unsplash.com/photo-1763198216782-b534fea3dcf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwbGFuZHNjYXBlJTIwc2NpLWZpfGVufDF8fHx8MTc3MzA2MDYxMXww&ixlib=rb-4.1.0&q=80&w=1080",
      prompt: "Futuristic sci-fi landscape with alien terrain",
      tags: ["Sci-Fi", "Landscape", "Futuristic"],
      style: "Cinematic",
      duration: "0:15"
    },
    {
      id: 5,
      thumbnail: "https://images.unsplash.com/photo-1574790335676-2a2bb9d70d08?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdXJwbGUlMjBwaW5rJTIwZ3JhZGllbnR8ZW58MXx8fHwxNzczMTI0NDI1fDA&ixlib=rb-4.1.0&q=80&w=1080",
      prompt: "Purple and pink gradient with smooth transitions",
      tags: ["Gradient", "Purple", "Aesthetic"],
      style: "Minimalist",
      duration: "0:10"
    },
    {
      id: 6,
      thumbnail: "https://images.unsplash.com/photo-1681673819379-a183d9acf860?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3NtaWMlMjB1bml2ZXJzZSUyMG5lYnVsYXxlbnwxfHx8fDE3NzMxMjQ0MjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
      prompt: "Cosmic universe with nebula and stars",
      tags: ["Space", "Cosmic", "Stars"],
      style: "Realistic",
      duration: "0:20"
    },
  ];
  
  return (
    <div className="min-h-screen bg-[#0F0F18]">
      <Navigation />
      
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-semibold mb-2 bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#22D3EE] bg-clip-text text-transparent">
            Library
          </h1>
          <p className="text-gray-400">Your collection of generated videos</p>
        </div>
        
        {/* Filters */}
        <NeonCard glow glowColor="purple" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Search Bar */}
            <div className="md:col-span-2">
              <label className="block text-white mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos..."
                  className="w-full pl-12 pr-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all"
                />
              </div>
            </div>
            
            {/* Style Filter */}
            <div>
              <label className="block text-white mb-2">Style</label>
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all"
              >
                {["All", "Cinematic", "Abstract", "Neon Cyberpunk", "Realistic", "Minimalist"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            {/* Date Filter */}
            <div>
              <label className="block text-white mb-2">Date</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all"
              >
                {["All Time", "Today", "This Week", "This Month"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </NeonCard>
        
        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group rounded-2xl overflow-hidden bg-[#171728] border-2 border-[#A855F7]/30 hover:border-[#A855F7] hover:shadow-xl hover:shadow-[#A855F7]/30 transition-all duration-300"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.prompt}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171728] via-transparent to-transparent opacity-80"></div>
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-white">
                  {video.duration}
                </div>
              </div>
              
              <div className="p-5">
                <p className="text-sm text-gray-400 mb-3 line-clamp-2 italic">
                  {video.prompt}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {video.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-[#A855F7]/10 text-[#A855F7] text-xs rounded-lg border border-[#A855F7]/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <NeonButton size="sm" variant="primary" icon={Download}>
                    
                  </NeonButton>
                  <NeonButton size="sm" variant="outline" icon={Copy}>
                    
                  </NeonButton>
                  <NeonButton size="sm" variant="cyan" icon={Eye}>
                    
                  </NeonButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
