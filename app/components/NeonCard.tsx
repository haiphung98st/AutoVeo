import { motion } from "motion/react";

interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  glowColor?: "purple" | "cyan";
}

export function NeonCard({ 
  children, 
  className = "", 
  glow = false,
  glowColor = "purple"
}: NeonCardProps) {
  const glowClasses = glow 
    ? glowColor === "purple"
      ? "shadow-lg shadow-[#A855F7]/20 border-[#A855F7]/30"
      : "shadow-lg shadow-[#22D3EE]/20 border-[#22D3EE]/30"
    : "border-[#2A2A3E]";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-[#171728] border rounded-2xl p-6 ${glowClasses} ${className}`}
    >
      {children}
    </motion.div>
  );
}
