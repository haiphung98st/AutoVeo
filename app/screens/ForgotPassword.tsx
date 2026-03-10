import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const handleSendReset = () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setSuccess(true);
  };
  
  return (
    <div className="min-h-screen bg-[#0F0F18]">
      <Navigation />
      
      <div className="max-w-[1600px] mx-auto px-6 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold mb-2 bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#22D3EE] bg-clip-text text-transparent">
              Forgot Password
            </h1>
            <p className="text-gray-400">Enter your email to receive reset instructions.</p>
          </div>
          
          {!success ? (
            <NeonCard glow glowColor="purple">
              <div className="space-y-5">
                {/* Email Input */}
                <div>
                  <label className="block text-white mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-12 pr-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-all"
                    />
                  </div>
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
                
                {/* Send Reset Button */}
                <NeonButton variant="primary" className="w-full" size="lg" onClick={handleSendReset}>
                  Send Reset Link
                </NeonButton>
                
                {/* Back to Login Link */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => navigate("/login")}
                    className="text-[#22D3EE] hover:text-[#A855F7] transition-colors inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </button>
                </div>
              </div>
            </NeonCard>
          ) : (
            <NeonCard glow glowColor="cyan">
              <div className="text-center space-y-5">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#22D3EE]/20 to-[#A855F7]/20 flex items-center justify-center border-2 border-[#22D3EE]">
                  <CheckCircle className="w-10 h-10 text-[#22D3EE]" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-2">Check Your Email</h2>
                  <p className="text-gray-400">
                    We've sent password reset instructions to{" "}
                    <span className="text-[#22D3EE]">{email}</span>
                  </p>
                </div>
                
                <div className="bg-[#0F0F18] border border-[#2A2A3E] rounded-xl p-4">
                  <p className="text-sm text-gray-400">
                    Didn't receive the email? Check your spam folder or{" "}
                    <button
                      onClick={() => setSuccess(false)}
                      className="text-[#A855F7] hover:text-[#22D3EE] transition-colors"
                    >
                      try again
                    </button>
                  </p>
                </div>
                
                <NeonButton 
                  variant="outline" 
                  className="w-full" 
                  icon={ArrowLeft}
                  onClick={() => navigate("/login")}
                >
                  Back to Login
                </NeonButton>
              </div>
            </NeonCard>
          )}
        </div>
      </div>
    </div>
  );
}
