import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface NeonButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "cyan" | "outline";
  icon?: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

export function NeonButton({
  children,
  onClick,
  variant = "primary",
  icon: Icon,
  className = "",
  size = "md",
  disabled = false,
}: NeonButtonProps) {
  const baseClasses = "rounded-2xl font-medium transition-all duration-300 flex items-center justify-center gap-2";

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3",
    lg: "px-8 py-4 text-lg",
  };

  const variantClasses = {
    primary: "bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30 hover:shadow-xl hover:shadow-[#A855F7]/50 hover:bg-[#9333EA]",
    secondary: "bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/30 hover:shadow-xl hover:shadow-[#7C3AED]/50 hover:bg-[#6D28D9]",
    cyan: "bg-[#22D3EE] text-[#0F0F18] shadow-lg shadow-[#22D3EE]/30 hover:shadow-xl hover:shadow-[#22D3EE]/50 hover:bg-[#06B6D4]",
    outline: "bg-transparent border-2 border-[#A855F7] text-[#A855F7] hover:bg-[#A855F7]/10 hover:shadow-lg hover:shadow-[#A855F7]/30",
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      disabled={disabled}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </motion.button>
  );
}
