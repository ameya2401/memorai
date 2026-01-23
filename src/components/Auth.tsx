import React, { useState } from 'react';
import { signIn, signUp, signInWithGoogle, verifyOtp } from '../lib/supabase';
import { LogIn, UserPlus, Mail, Lock, ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Successfully signed in!');
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast.success('Confirmation code sent! Please check your email.');
        setIsVerifying(true);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await verifyOtp(email, otp);
      if (error) throw error;
      toast.success('Email verified successfully! You are now signed in.');
      // verifyOtp typically handles the session creation automatically
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-white'
      }`} style={{ fontFamily: "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className={`border rounded-lg p-4 w-full max-w-md transition-colors duration-300 ${isDarkMode
        ? 'bg-[#191919] border-[#2e2e2e]'
        : 'bg-white border-[#e9e9e9]'
        }`}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4">
            <img
              src="/logo.png"
              alt="Memorai Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className={`text-xl font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#e9e9e9]' : 'text-[#37352f]'
            }`}>Memorai</h1>
          <p className={`text-xs font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
            }`}>A personal archive for curated web content</p>
        </div>

        {!isVerifying && (
          <div className="mb-6">
            <button
              onClick={handleGoogleLogin}
              className={`w-full py-2 px-4 border rounded-lg font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 ${isDarkMode
                ? 'bg-[#2e2e2e] text-[#e9e9e9] border-[#2e2e2e] hover:bg-[#3e3e3e]'
                : 'bg-white text-[#37352f] border-[#e9e9e9] hover:bg-[#f1f1ef]'
                }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative flex items-center justify-center mt-6">
              <div className={`absolute inset-0 flex items-center`}>
                <div className={`w-full border-t transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e]' : 'border-[#e9e9e9]'
                  }`}></div>
              </div>
              <div className={`relative px-4 text-xs font-normal transition-colors duration-300 ${isDarkMode ? 'bg-[#191919] text-[#787774]' : 'bg-white text-[#9b9a97]'
                }`}>
                Or continue with email
              </div>
            </div>
          </div>
        )}

        {isVerifying ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="otp" className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
                }`}>
                Verification Code
              </label>
              <div className="relative">
                <ShieldCheck className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                  }`} />
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  placeholder="Enter 6-digit code"
                  className={`w-full pl-10 pr-3 py-1.5 border rounded-lg font-normal text-sm transition-all duration-300 focus:outline-none ${isDarkMode
                    ? 'bg-[#191919] border-[#2e2e2e] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                    : 'bg-white border-[#e9e9e9] text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                    }`}
                />
              </div>
              <p className={`text-xs mt-2 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                }`}>
                We've sent a confirmation code to <span className="font-medium">{email}</span>. Check your spam folder if you don't see it.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-1.5 px-2 border rounded-lg font-normal text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isDarkMode
                ? 'bg-[#2e2e2e] text-[#e9e9e9] border-[#2e2e2e] hover:bg-[#3e3e3e]'
                : 'bg-[#f1f1ef] text-[#37352f] border-[#e9e9e9] hover:bg-[#e9e9e9]'
                }`}
            >
              {loading ? (
                <div className={`animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent ${isDarkMode ? 'border-[#e9e9e9]' : 'border-[#37352f]'
                  }`}></div>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verify Email
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsVerifying(false)}
              className={`w-full text-xs underline transition-colors duration-300 ${isDarkMode ? 'text-[#787774] hover:text-[#e9e9e9]' : 'text-[#787774] hover:text-[#37352f]'
                }`}
            >
              Back to Sign Up
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
                }`}>
                Email
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                  }`} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full pl-10 pr-3 py-1.5 border rounded-lg font-normal text-sm transition-all duration-300 focus:outline-none ${isDarkMode
                    ? 'bg-[#191919] border-[#2e2e2e] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                    : 'bg-white border-[#e9e9e9] text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                    }`}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-[#c9c9c9]' : 'text-[#787774]'
                }`}>
                Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
                  }`} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full pl-10 pr-3 py-1.5 border rounded-lg font-normal text-sm transition-all duration-300 focus:outline-none ${isDarkMode
                    ? 'bg-[#191919] border-[#2e2e2e] text-[#e9e9e9] placeholder-[#787774] focus:border-[#3e3e3e]'
                    : 'bg-white border-[#e9e9e9] text-[#37352f] placeholder-[#9b9a97] focus:border-[#c9c9c9]'
                    }`}
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-1.5 px-2 border rounded-lg font-normal text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isDarkMode
                ? 'bg-[#2e2e2e] text-[#e9e9e9] border-[#2e2e2e] hover:bg-[#3e3e3e]'
                : 'bg-[#f1f1ef] text-[#37352f] border-[#e9e9e9] hover:bg-[#e9e9e9]'
                }`}
            >
              {loading ? (
                <div className={`animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent ${isDarkMode ? 'border-[#e9e9e9]' : 'border-[#37352f]'
                  }`}></div>
              ) : (
                <>
                  {isLogin ? <LogIn className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </>
              )}
            </button>
          </form>
        )}

        <div className={`mt-6 pt-4 border-t text-center transition-colors duration-300 ${isDarkMode ? 'border-[#2e2e2e]' : 'border-[#e9e9e9]'
          }`}>
          <p className={`text-sm font-normal transition-colors duration-300 ${isDarkMode ? 'text-[#787774]' : 'text-[#787774]'
            }`}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className={`font-normal text-sm transition-all duration-150 mt-1 underline ${isDarkMode ? 'text-[#e9e9e9] hover:text-[#c9c9c9]' : 'text-[#37352f] hover:text-[#787774]'
              }`}
          >
            {isLogin ? 'Sign up here' : 'Sign in here'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;