import { Link, useLocation } from "react-router";
import { Sparkles, UserCircle } from "lucide-react";

export function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { name: "Dashboard", path: "/" },
    { name: "Trends", path: "/trends" },
    { name: "Prompt Engine", path: "/prompt-engine" },
    { name: "Render", path: "/render" },
    { name: "Library", path: "/library" },
  ];
  
  return (
    <nav className="bg-[#171728] border-b border-[#2A2A3E] sticky top-0 z-50 backdrop-blur-sm bg-opacity-90">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#A855F7] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-[#A855F7]/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
              Vision Craft v2
            </span>
          </Link>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-5 py-2.5 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30"
                      : "text-gray-400 hover:text-white hover:bg-[#2A2A3E]"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
            
            <Link
              to="/login"
              className="ml-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#7C3AED] text-white hover:shadow-lg hover:shadow-[#A855F7]/30 transition-all duration-300 flex items-center gap-2"
            >
              <UserCircle className="w-5 h-5" />
              Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}