import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useResume } from '../contexts/ResumeContext';
import type { Task, ResumeResult } from '../types';
import UploadModal from '../components/UploadModal';
import PipelineVisualization from '../components/PipelineVisualization';
import ExportPDFButton from '../components/ExportPDF';
import { StatCardSkeleton, TableRowSkeleton, MobileCardSkeleton } from '../components/LoadingSkeleton';

function StatusBadge({ status }: { status: Task['status'] }) {
  const styles: Record<Task['status'], string> = {
    completed: 'bg-success-500/15 text-success-400 border-success-500/25',
    processing: 'bg-accent-500/15 text-accent-400 border-accent-500/25',
    queued: 'bg-warning-500/15 text-warning-400 border-warning-500/25',
    failed: 'bg-danger-500/15 text-danger-400 border-danger-500/25',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'completed' ? 'bg-success-400' :
        status === 'processing' ? 'bg-accent-400 animate-pulse' :
        status === 'queued' ? 'bg-warning-400' : 'bg-danger-400'
      }`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(148,163,184,0.1)" strokeWidth="5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <span className="absolute text-lg font-bold text-surface-100">{score}</span>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="glass-light rounded-xl p-5 hover:border-primary-500/20 transition-all duration-300 group">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
        <span className="text-sm text-surface-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-surface-100 group-hover:text-white transition-colors">{value}</p>
    </div>
  );
}

function ResultPanel({ result, onClose }: { result: ResumeResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-surface-900 border-l border-surface-700/50 overflow-y-auto animate-slide-left">
        <div className="sticky top-0 z-10 glass border-b border-surface-700/50 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-surface-50">{result.name}</h2>
            <p className="text-sm text-surface-400">{result.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportPDFButton result={result} />
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center transition-colors border-none cursor-pointer text-surface-400 hover:text-surface-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-5 items-start">
            <ScoreRing score={result.overall_score ?? 0} size={80} />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-1">Verdict</h3>
              <p className="text-sm text-surface-300 leading-relaxed">{result.summary_verdict}</p>
            </div>
          </div>
          <div className="glass-light rounded-xl p-4">
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-2">Professional Summary</h3>
            <p className="text-sm text-surface-200 leading-relaxed">{result.summary}</p>
          </div>
          {result.skills && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {result.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 rounded-full bg-primary-500/10 text-primary-300 text-xs font-medium border border-primary-500/20">{skill}</span>
                ))}
              </div>
            </div>
          )}
          {result.section_feedback && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">Section Scores</h3>
              <div className="space-y-3">
                {result.section_feedback.map((sf) => (
                  <div key={sf.section} className="glass-light rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-surface-200">{sf.section}</span>
                      <span className={`text-sm font-bold ${sf.score >= 80 ? 'text-success-400' : sf.score >= 60 ? 'text-warning-400' : 'text-danger-400'}`}>{sf.score}/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-700 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${sf.score >= 80 ? 'bg-success-400' : sf.score >= 60 ? 'bg-warning-400' : 'bg-danger-400'}`} style={{ width: `${sf.score}%` }} />
                    </div>
                    {sf.strengths.length > 0 && <div className="mt-2">{sf.strengths.map((s, i) => <p key={i} className="text-xs text-success-400/80 flex items-start gap-1.5 mt-1"><span className="mt-0.5">✓</span> {s}</p>)}</div>}
                    {sf.weaknesses.length > 0 && <div className="mt-1.5">{sf.weaknesses.map((w, i) => <p key={i} className="text-xs text-warning-400/80 flex items-start gap-1.5 mt-1"><span className="mt-0.5">△</span> {w}</p>)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.suggestions && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">Suggestions</h3>
              <div className="space-y-2">{result.suggestions.map((s, i) => <div key={i} className="flex items-start gap-3 text-sm text-surface-300"><span className="w-5 h-5 rounded-full bg-primary-500/15 text-primary-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>{s}</div>)}</div>
            </div>
          )}
          {result.ats_tips && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">ATS Tips</h3>
              <div className="glass-light rounded-lg p-4 space-y-2">{result.ats_tips.map((tip, i) => <p key={i} className="text-sm text-accent-400/90 flex items-start gap-2"><span className="mt-0.5">💡</span> {tip}</p>)}</div>
            </div>
          )}
          {result.keywords_missing && result.keywords_missing.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">Missing Keywords</h3>
              <div className="flex flex-wrap gap-2">{result.keywords_missing.map((kw) => <span key={kw} className="px-3 py-1 rounded-full bg-danger-500/10 text-danger-400 text-xs font-medium border border-danger-500/20">{kw}</span>)}</div>
            </div>
          )}
          {result.work_experience && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">Work Experience</h3>
              <div className="space-y-4">
                {result.work_experience.map((we, i) => (
                  <div key={i} className="glass-light rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div><p className="text-sm font-semibold text-surface-100">{we.title}</p><p className="text-sm text-primary-400">{we.company}</p></div>
                      {we.duration && <span className="text-xs text-surface-500 whitespace-nowrap">{we.duration}</span>}
                    </div>
                    {we.highlights && <ul className="mt-2 space-y-1">{we.highlights.map((h, j) => <li key={j} className="text-xs text-surface-400 flex items-start gap-2"><span className="text-surface-600 mt-0.5">•</span> {h}</li>)}</ul>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { tasks, results, isLoadingTasks } = useResume();
  const [selectedResult, setSelectedResult] = useState<ResumeResult | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const activeTasks = tasks.filter((t) => t.status === 'queued' || t.status === 'processing');
  const avgScore = completedTasks.length > 0
    ? Math.round(completedTasks.reduce((sum, t) => sum + (results[t.id]?.overall_score ?? 0), 0) / completedTasks.length)
    : 0;
  const totalSkills = new Set(completedTasks.flatMap((t) => results[t.id]?.skills ?? [])).size;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 glass border-b border-surface-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            </div>
            <span className="text-lg font-bold gradient-text hidden sm:inline">ResuFlow</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-xs font-bold text-white">{user?.email?.charAt(0).toUpperCase()}</div>
              <span className="text-sm text-surface-300">{user?.email}</span>
            </div>
            <button id="logout-button" onClick={logout} className="px-3 py-1.5 rounded-lg text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all border-none cursor-pointer bg-transparent font-medium">Sign out</button>
          </div>
          <button className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-800 transition-colors border-none bg-transparent cursor-pointer text-surface-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-surface-700/50 p-4 space-y-3 animate-slide-down">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-xs font-bold text-white">{user?.email?.charAt(0).toUpperCase()}</div>
              <span className="text-sm text-surface-300">{user?.email}</span>
            </div>
            <button onClick={logout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-danger-400 hover:bg-surface-800 transition-all border-none cursor-pointer bg-transparent">Sign out</button>
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl sm:text-4xl font-bold text-surface-50">Welcome back<span className="gradient-text">.</span></h1>
          <p className="mt-2 text-surface-400">Here's an overview of your resume analyses.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up [animation-delay:0.1s]">
          {isLoadingTasks ? (
            <>{[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}</>
          ) : (
            <>
              <StatCard icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>} label="Total Resumes" value={tasks.length} accent="bg-primary-500/20" />
              <StatCard icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>} label="Avg Score" value={avgScore} accent="bg-success-500/20" />
              <StatCard icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} label="Completed" value={completedTasks.length} accent="bg-accent-500/20" />
              <StatCard icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>} label="Skills Found" value={totalSkills} accent="bg-warning-500/20" />
            </>
          )}
        </div>

        {/* Upload Button */}
        <div className="mb-8 animate-slide-up [animation-delay:0.15s]">
          <button id="upload-resume-button" className="btn-primary gap-2" onClick={() => setUploadOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Upload Resume
          </button>
        </div>

        {/* Active Pipeline Visualizations */}
        {activeTasks.length > 0 && (
          <div className="mb-8 space-y-4 animate-slide-up [animation-delay:0.18s]">
            <h2 className="text-xl font-bold text-surface-100">Active Processing</h2>
            {activeTasks.map((task) => (
              <PipelineVisualization key={task.id} task={task} hasResult={!!results[task.id]} />
            ))}
          </div>
        )}

        {/* Recent Analyses */}
        <div className="animate-slide-up [animation-delay:0.2s]">
          <h2 className="text-xl font-bold text-surface-100 mb-4">Recent Analyses</h2>

          {/* Empty state */}
          {!isLoadingTasks && tasks.length === 0 && (
            <div className="glass rounded-xl p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-surface-200 mb-2">No resumes yet</h3>
              <p className="text-sm text-surface-400 mb-6">Upload your first resume to get AI-powered analysis.</p>
              <button className="btn-primary" onClick={() => setUploadOpen(true)}>Upload Resume</button>
            </div>
          )}

          {/* Desktop Table */}
          {(isLoadingTasks || tasks.length > 0) && (
            <div className="hidden md:block glass rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-700/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Candidate</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Score</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Skills</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingTasks
                    ? [1,2,3].map(i => <TableRowSkeleton key={i} />)
                    : tasks.map((task) => {
                        const result = results[task.id];
                        return (
                          <tr key={task.id} className="border-b border-surface-700/30 last:border-b-0 hover:bg-surface-800/30 transition-colors">
                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-surface-100">{result?.name ?? task.file_url.split('/').pop()}</p>
                              <p className="text-xs text-surface-500">{result?.email ?? '—'}</p>
                            </td>
                            <td className="px-5 py-4">{result?.overall_score != null ? <ScoreRing score={result.overall_score} size={44} /> : <span className="text-sm text-surface-500">—</span>}</td>
                            <td className="px-5 py-4"><StatusBadge status={task.status} /></td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {(result?.skills ?? []).slice(0, 3).map((s) => <span key={s} className="text-xs px-2 py-0.5 rounded bg-surface-800 text-surface-300">{s}</span>)}
                                {(result?.skills?.length ?? 0) > 3 && <span className="text-xs px-2 py-0.5 rounded bg-surface-800 text-surface-500">+{result!.skills!.length - 3}</span>}
                                {!result?.skills && <span className="text-xs text-surface-500">—</span>}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-surface-400">{new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                            <td className="px-5 py-4 text-right">
                              {result ? <button onClick={() => setSelectedResult(result)} className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors bg-transparent border-none cursor-pointer">View details →</button> : <span className="text-xs text-surface-600">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Cards */}
          {(isLoadingTasks || tasks.length > 0) && (
            <div className="md:hidden space-y-3">
              {isLoadingTasks
                ? [1,2,3].map(i => <MobileCardSkeleton key={i} />)
                : tasks.map((task) => {
                    const result = results[task.id];
                    return (
                      <div key={task.id} className="glass-light rounded-xl p-4 cursor-pointer hover:border-primary-500/20 transition-all" onClick={() => result && setSelectedResult(result)}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-surface-100">{result?.name ?? task.file_url.split('/').pop()}</p>
                            <p className="text-xs text-surface-500 mt-0.5">{result?.email ?? '—'}</p>
                          </div>
                          {result?.overall_score != null ? <ScoreRing score={result.overall_score} size={40} /> : <StatusBadge status={task.status} />}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">{(result?.skills ?? []).slice(0, 3).map((s) => <span key={s} className="text-xs px-2 py-0.5 rounded bg-surface-800 text-surface-300">{s}</span>)}</div>
                          <StatusBadge status={task.status} />
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      </main>

      {selectedResult && <ResultPanel result={selectedResult} onClose={() => setSelectedResult(null)} />}
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
