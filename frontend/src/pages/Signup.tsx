import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await signup(email, password);
      navigate('/dashboard');
    } catch {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* ── Background Decoration ──────────────────────── */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary-600/20 blur-[120px] animate-pulse-soft" />
        <div className="absolute bottom-[-20%] left-[-8%] w-[450px] h-[450px] rounded-full bg-accent-500/15 blur-[100px] animate-pulse-soft [animation-delay:1.5s]" />
        <div className="absolute top-[50%] right-[50%] w-[250px] h-[250px] rounded-full bg-primary-400/10 blur-[80px] animate-float" />
      </div>

      <div className="w-full max-w-md animate-scale-in">
        {/* ── Logo / Brand ──────────────────────────────── */}
        <div className="text-center mb-8 animate-slide-down">
          <Link to="/" className="inline-flex items-center gap-3 no-underline group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span className="text-2xl font-bold gradient-text">ResuFlow</span>
          </Link>
          <p className="mt-3 text-surface-400 text-sm">Create your account to get started</p>
        </div>

        {/* ── Card ──────────────────────────────────────── */}
        <div className="glass rounded-2xl p-8 shadow-2xl shadow-black/20">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-surface-50">Create account</h1>
            <p className="text-surface-400 text-sm mt-1">Start analysing your resumes with AI</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-surface-300 mb-2">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-base"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="signup-password" className="block text-sm font-medium text-surface-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors bg-transparent border-none cursor-pointer font-medium"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="input-base"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="signup-confirm" className="block text-sm font-medium text-surface-300 mb-2">
                Confirm password
              </label>
              <input
                id="signup-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="input-base"
                autoComplete="new-password"
              />
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-surface-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors no-underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-surface-600 text-xs mt-6">
          © 2026 ResuFlow. Built with AI.
        </p>
      </div>
    </div>
  );
}
