import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect authenticated users to dashboard
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ── Background Decoration ──────────────────────── */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary-700/20 blur-[140px] animate-pulse-soft" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-accent-500/15 blur-[120px] animate-pulse-soft [animation-delay:1.5s]" />
        <div className="absolute top-[40%] left-[55%] w-[350px] h-[350px] rounded-full bg-primary-500/8 blur-[100px] animate-float" />
        <div className="absolute top-[10%] right-[20%] w-[200px] h-[200px] rounded-full bg-accent-400/8 blur-[80px] animate-float [animation-delay:3s]" />
      </div>

      {/* ── Navbar ────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 glass border-b border-surface-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <span className="text-lg font-bold gradient-text">ResuFlow</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg text-sm font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-all no-underline"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="btn-primary text-sm py-2 no-underline"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            <span className="text-xs font-medium text-primary-300">AI-Powered Resume Analysis</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-surface-50 leading-tight max-w-3xl mx-auto">
            Get your resume{' '}
            <span className="gradient-text">analysed by AI</span>{' '}
            in seconds
          </h1>

          <p className="mt-6 text-lg text-surface-400 max-w-2xl mx-auto leading-relaxed">
            Upload your resume and get instant feedback powered by Google Gemini.
            Receive a detailed score, section-by-section analysis, ATS tips, and
            actionable suggestions to land your dream job.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/signup"
              className="btn-primary text-base px-8 py-3 no-underline shadow-lg shadow-primary-500/25"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Your Resume
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold text-surface-300 hover:text-surface-100 border border-surface-700/60 hover:border-surface-600 hover:bg-surface-800/40 transition-all no-underline"
            >
              Sign In
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── Floating Stats ─────────────────────────────── */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto animate-slide-up [animation-delay:0.2s]">
          {[
            { value: 'Gemini', label: 'Powered by' },
            { value: 'RAG', label: 'Analysis Pipeline' },
            { value: '< 60s', label: 'Processing Time' },
            { value: 'PDF', label: 'Export Reports' },
          ].map((stat) => (
            <div key={stat.label} className="glass-light rounded-xl py-4 px-3">
              <p className="text-xl font-bold gradient-text">{stat.value}</p>
              <p className="text-xs text-surface-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Section ──────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14 animate-slide-up [animation-delay:0.3s]">
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-50">
            Everything you need to{' '}
            <span className="gradient-text">stand out</span>
          </h2>
          <p className="mt-4 text-surface-400 max-w-xl mx-auto">
            Our AI pipeline analyses every aspect of your resume and delivers actionable insights.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up [animation-delay:0.4s]">
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              ),
              title: 'AI-Powered Analysis',
              desc: 'Google Gemini evaluates your resume holistically — scoring sections, identifying strengths, and highlighting areas for improvement.',
              accent: 'from-primary-500/20 to-primary-700/10',
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              ),
              title: 'ATS Compatibility',
              desc: 'Get tips to ensure your resume passes Applicant Tracking Systems — from formatting to keyword optimization.',
              accent: 'from-accent-500/20 to-accent-600/10',
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ),
              title: 'Section Scoring',
              desc: 'Each section — Experience, Skills, Education — receives its own score with detailed strengths and weaknesses.',
              accent: 'from-warning-400/20 to-warning-500/10',
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              ),
              title: 'Missing Keywords',
              desc: 'Discover important industry keywords your resume is missing and boost your visibility to recruiters.',
              accent: 'from-danger-400/20 to-danger-500/10',
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 18 15 15" />
                </svg>
              ),
              title: 'PDF Reports',
              desc: 'Export your complete analysis as a beautifully formatted PDF report — ready to share or reference.',
              accent: 'from-success-400/20 to-success-500/10',
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
              ),
              title: 'Live Pipeline',
              desc: 'Watch your resume flow through our processing pipeline in real-time — Upload → Parse → Embed → Analyse → Done.',
              accent: 'from-primary-400/20 to-accent-500/10',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="glass-light rounded-2xl p-6 hover:border-primary-500/20 transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.accent} flex items-center justify-center text-primary-400 mb-4 group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-surface-100 mb-2">{feature.title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-50">
            Three steps to a{' '}
            <span className="gradient-text">better resume</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {[
            {
              step: '01',
              title: 'Upload',
              desc: 'Drop your PDF, DOCX, or TXT resume file.',
            },
            {
              step: '02',
              title: 'AI Analysis',
              desc: 'Gemini parses, embeds, and evaluates your resume via our RAG pipeline.',
            },
            {
              step: '03',
              title: 'Get Results',
              desc: 'View your score, feedback, and suggestions — then export as PDF.',
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary-500/15 to-accent-500/10 flex items-center justify-center mb-4">
                <span className="text-xl font-bold gradient-text">{item.step}</span>
              </div>
              <h3 className="text-lg font-semibold text-surface-100 mb-2">{item.title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="glass rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-20%] w-[400px] h-[400px] rounded-full bg-primary-600/15 blur-[100px]" />
          <div className="absolute bottom-[-30%] right-[-10%] w-[300px] h-[300px] rounded-full bg-accent-500/10 blur-[80px]" />

          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-50 mb-4">
              Ready to improve your resume?
            </h2>
            <p className="text-surface-400 mb-8 max-w-lg mx-auto">
              Join ResuFlow and get AI-powered insights to make your resume stand out from the crowd.
            </p>
            <Link
              to="/signup"
              className="btn-primary text-base px-8 py-3 no-underline shadow-lg shadow-primary-500/25"
            >
              Get Started — It's Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-surface-700/50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span className="text-sm font-semibold gradient-text">ResuFlow</span>
          </div>
          <p className="text-xs text-surface-600">
            © {new Date().getFullYear()} ResuFlow. Built with AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
