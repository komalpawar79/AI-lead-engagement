import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  MessageSquare,
  TrendingUp,
  Flame,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { loginApi } from '../services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await loginApi({ email, password });
      if (response && response.token) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
      }
      navigate('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans selection:bg-orange-100 selection:text-orange-900">
      
      {/* ========================================================= */}
      {/* LEFT SIDE: Full-Bleed Real Estate Hero (User's New Image) */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 min-h-[500px] lg:min-h-screen relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden bg-slate-950">
        
        {/* Background Image: Couple discussing property papers with consultant */}
        <img
          src="/login-couple.png"
          alt="Homebuyers reviewing property agreement with consultant"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
        />

        {/* Multi-layered Dark Gradient for high readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent" />

        {/* Top Header on Left Side */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">
                AI LeadEngage
              </span>
              <span className="block text-[11px] font-medium text-orange-400">
                Smarter Leads. Faster Sales.
              </span>
            </div>
          </div>
        </div>

        {/* Center / Hero Content Overlay */}
        <div className="relative z-10 my-auto py-10 space-y-6 max-w-xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-orange-300">
            <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            <span>AI Real Estate Lead Engagement & Follow-up Extraction</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] drop-shadow-sm">
            Turn Inactive Leads into Serious Buyers with AI Conversations.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed drop-shadow">
            Instead of sales teams cold-calling 1,000 leads, our AI conducts natural multi-turn conversations over WhatsApp, extracts BHK requirements & budgets, and hands over verified follow-ups to presales.
          </p>

          {/* Key Feature Highlights Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>1st-Touch WhatsApp AI Outreach</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Multi-Turn Hinglish & English Chat</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Intent, BHK & Budget Extraction</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>1-Click Excel Follow-Up Export</span>
            </div>
          </div>
        </div>

        {/* Bottom Stat Card */}
        <div className="relative z-10 pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="font-semibold text-white">Funnel Transformation:</span>
            <span>1,000 Raw Leads ➔ 85 Qualified Presales Follow-ups</span>
          </div>
          <span className="text-[11px] text-slate-400">Save 40+ hrs manual cold calling</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT SIDE: Full-Height Clean Admin Login Panel           */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white overflow-y-auto">
        
        {/* Top Spacer / Header info */}
        <div className="flex items-center justify-between">
          <div className="lg:hidden flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">AI LeadEngage</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium ml-auto flex items-center space-x-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Admin Portal</span>
          </div>
        </div>

        {/* Center: Main Form Container */}
        <div className="max-w-[420px] w-full mx-auto my-auto py-8 space-y-6">
          
          {/* Headline & Subtitle */}
          <div className="space-y-1.5 text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Sign in to manage your real estate AI campaigns & presales follow-up queue.
            </p>
          </div>

          {/* Social Auth Buttons - Google Only */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => alert('Google Single Sign-On (SSO) will connect with your registered Google account.')}
              className="w-full py-2.5 px-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center space-x-2.5 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider relative">
              Or continue with email
            </span>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="bg-[#f4f5f8] rounded-xl px-4 py-2.5 border border-transparent focus-within:border-slate-300 transition-all">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none placeholder-slate-400 pt-0.5"
              />
            </div>

            {/* Password */}
            <div className="bg-[#f4f5f8] rounded-xl px-4 py-2.5 border border-transparent focus-within:border-slate-300 transition-all flex items-center justify-between">
              <div className="flex-1 pr-2">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none placeholder-slate-400 pt-0.5"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="text-[11px] font-medium text-slate-600">Remember me</span>
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert('To reset your credentials, please contact support or your organization administrator at support@leadengage.ai');
                }}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2"
              >
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-[#482845] hover:bg-[#381f36] text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Footer Signup Prompt */}
          <div className="text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/" className="font-bold text-slate-900 hover:underline">
              Request Access
            </Link>
          </div>
        </div>

        {/* Bottom Security / Copyright Note */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>© 2026 AI LeadEngage • Real Estate Intelligence</span>
          <span className="flex items-center space-x-1 text-slate-500">
            <Lock className="w-3 h-3 text-emerald-500" />
            <span>256-bit Encrypted Session • Supabase Connected</span>
          </span>
        </div>

      </div>

    </div>
  );
};

export default Login;
