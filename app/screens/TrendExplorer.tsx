import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { TrendingUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export function TrendExplorer() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState("YouTube");
  const [timeRange, setTimeRange] = useState("7 days");
  const [region, setRegion] = useState("Global");
  
  const trends = [
    { id: 1, title: "AI Technology Revolution", delta: "+245%", category: "Technology", thumbnail: "https://images.unsplash.com/photo-1655393001768-d946c97d6fd1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwdGVjaG5vbG9neSUyMGFpfGVufDF8fHx8MTc3MzEyNDMxNXww&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 2, title: "Urban Street Culture", delta: "+189%", category: "Lifestyle", thumbnail: "https://images.unsplash.com/photo-1762583748303-09562498d1dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB1cmJhbiUyMHN0cmVldHxlbnwxfHx8fDE3NzMxMjQzMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 3, title: "Mountain Exploration", delta: "+156%", category: "Travel", thumbnail: "https://images.unsplash.com/photo-1598439473183-42c9301db5dc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuYXR1cmUlMjBtb3VudGFpbiUyMGxhbmRzY2FwZXxlbnwxfHx8fDE3NzMxMTQzMjV8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 4, title: "Abstract Design Trends", delta: "+134%", category: "Design", thumbnail: "https://images.unsplash.com/photo-1595411425732-e69c1abe2763?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMHBhdHRlcm58ZW58MXx8fHwxNzczMDk2NTc2fDA&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 5, title: "Ocean Sunset Vibes", delta: "+98%", category: "Nature", thumbnail: "https://images.unsplash.com/photo-1604580826165-2c7542834eb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvY2VhbiUyMHdhdmVzJTIwc3Vuc2V0fGVufDF8fHx8MTc3MzExNzAyOXww&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 6, title: "Space & Galaxy Content", delta: "+87%", category: "Science", thumbnail: "https://images.unsplash.com/photo-1500185497267-d635f9c5e90f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGFjZSUyMGdhbGF4eSUyMHN0YXJzfGVufDF8fHx8MTc3MzA0ODkwNXww&ixlib=rb-4.1.0&q=80&w=1080" },
  ];
  
  return (
    <div className="min-h-screen bg-[#0F0F18]">
      <Navigation />
      
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold mb-2 bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#22D3EE] bg-clip-text text-transparent">
            Trend Explorer
          </h1>
          <p className="text-gray-400">Discover what's trending across platforms</p>
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
                    className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                      platform === p
                        ? "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30"
                        : "bg-[#0F0F18] text-gray-400 hover:text-white hover:bg-[#2A2A3E] border border-[#2A2A3E]"
                    }`}
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
                    className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                      timeRange === t
                        ? "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30"
                        : "bg-[#0F0F18] text-gray-400 hover:text-white hover:bg-[#2A2A3E] border border-[#2A2A3E]"
                    }`}
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
                    className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                      region === r
                        ? "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30"
                        : "bg-[#0F0F18] text-gray-400 hover:text-white hover:bg-[#2A2A3E] border border-[#2A2A3E]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </NeonCard>
          </div>
          
          {/* Main Trend Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {trends.map((trend) => (
                <div
                  key={trend.id}
                  className="group rounded-2xl overflow-hidden bg-[#171728] border-2 border-[#A855F7]/30 hover:border-[#A855F7] hover:shadow-xl hover:shadow-[#A855F7]/30 transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={trend.thumbnail}
                      alt={trend.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171728] via-transparent to-transparent opacity-80"></div>
                    <div className="absolute top-3 right-3 bg-[#22D3EE] px-3 py-1 rounded-lg flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-[#0F0F18]" />
                      <span className="text-sm font-semibold text-[#0F0F18]">{trend.delta}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mb-3">
                      <h3 className="text-white font-semibold mb-1">{trend.title}</h3>
                      <span className="inline-block px-3 py-1 bg-[#A855F7]/10 text-[#A855F7] text-xs rounded-lg border border-[#A855F7]/30">
                        {trend.category}
                      </span>
                    </div>
                    <NeonButton 
                      size="sm" 
                      variant="primary" 
                      icon={Sparkles} 
                      className="w-full"
                      onClick={() => navigate("/prompt-engine")}
                    >
                      Use for Prompt
                    </NeonButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
