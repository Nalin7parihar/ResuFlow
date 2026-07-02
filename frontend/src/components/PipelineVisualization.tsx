import { useMemo } from 'react';
import type { Task } from '../types';

interface PipelineVisualizationProps {
  task: Task;
  hasResult: boolean;
}

interface StageInfo {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: 'completed' | 'active' | 'pending' | 'failed';
}

/**
 * Real-time pipeline tracker showing processing stages:
 * Upload → Parsing → Embedding → Analysing → Complete
 */
export default function PipelineVisualization({ task, hasResult }: PipelineVisualizationProps) {
  const stages = useMemo((): StageInfo[] => {
    const taskStatus = task.status;

    // Determine which stage is active based on task status
    // Since the backend doesn't expose granular stage info, we infer from status
    if (taskStatus === 'failed') {
      return [
        { key: 'upload', label: 'Uploaded', icon: uploadIcon, status: 'completed' },
        { key: 'parse', label: 'Parsing', icon: parseIcon, status: 'failed' },
        { key: 'embed', label: 'Embedding', icon: embedIcon, status: 'pending' },
        { key: 'analyse', label: 'Analysing', icon: analyseIcon, status: 'pending' },
        { key: 'done', label: 'Complete', icon: doneIcon, status: 'pending' },
      ];
    }

    if (taskStatus === 'completed' && hasResult) {
      return [
        { key: 'upload', label: 'Uploaded', icon: uploadIcon, status: 'completed' },
        { key: 'parse', label: 'Parsed', icon: parseIcon, status: 'completed' },
        { key: 'embed', label: 'Embedded', icon: embedIcon, status: 'completed' },
        { key: 'analyse', label: 'Analysed', icon: analyseIcon, status: 'completed' },
        { key: 'done', label: 'Complete', icon: doneIcon, status: 'completed' },
      ];
    }

    if (taskStatus === 'processing') {
      // Use task updated_at vs created_at to guess progress
      const elapsed = Date.now() - new Date(task.updated_at).getTime();
      let activeStage = 1; // parse by default
      if (elapsed > 15000) activeStage = 3; // analysing
      else if (elapsed > 8000) activeStage = 2; // embedding

      return [
        { key: 'upload', label: 'Uploaded', icon: uploadIcon, status: 'completed' },
        { key: 'parse', label: 'Parsing', icon: parseIcon, status: activeStage === 1 ? 'active' : 'completed' },
        { key: 'embed', label: 'Embedding', icon: embedIcon, status: activeStage === 2 ? 'active' : activeStage > 2 ? 'completed' : 'pending' },
        { key: 'analyse', label: 'Analysing', icon: analyseIcon, status: activeStage === 3 ? 'active' : 'pending' },
        { key: 'done', label: 'Complete', icon: doneIcon, status: 'pending' },
      ];
    }

    // queued
    return [
      { key: 'upload', label: 'Uploaded', icon: uploadIcon, status: 'completed' },
      { key: 'parse', label: 'Parse', icon: parseIcon, status: 'pending' },
      { key: 'embed', label: 'Embed', icon: embedIcon, status: 'pending' },
      { key: 'analyse', label: 'Analyse', icon: analyseIcon, status: 'pending' },
      { key: 'done', label: 'Complete', icon: doneIcon, status: 'pending' },
    ];
  }, [task, hasResult]);

  return (
    <div className="glass-light rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-surface-200">Processing Pipeline</span>
        {task.status === 'processing' && (
          <span className="text-xs text-accent-400 animate-pulse ml-auto">Live</span>
        )}
      </div>

      {/* Pipeline Steps */}
      <div className="flex items-center justify-between gap-1">
        {stages.map((stage, i) => (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            {/* Node */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                  stage.status === 'completed'
                    ? 'bg-success-500/20 text-success-400 ring-2 ring-success-500/30'
                    : stage.status === 'active'
                    ? 'bg-accent-500/20 text-accent-400 ring-2 ring-accent-500/40 animate-pulse'
                    : stage.status === 'failed'
                    ? 'bg-danger-500/20 text-danger-400 ring-2 ring-danger-500/30'
                    : 'bg-surface-800 text-surface-600'
                }`}
              >
                {stage.status === 'completed' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : stage.status === 'failed' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  stage.icon
                )}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  stage.status === 'completed'
                    ? 'text-success-400'
                    : stage.status === 'active'
                    ? 'text-accent-400'
                    : stage.status === 'failed'
                    ? 'text-danger-400'
                    : 'text-surface-600'
                }`}
              >
                {stage.label}
              </span>
            </div>

            {/* Connector line */}
            {i < stages.length - 1 && (
              <div className="flex-1 h-0.5 mx-1.5 rounded-full overflow-hidden bg-surface-700/50 mt-[-18px]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    stage.status === 'completed'
                      ? 'w-full bg-success-400/60'
                      : stage.status === 'active'
                      ? 'w-1/2 bg-accent-400/40 animate-shimmer'
                      : 'w-0'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error message for failed tasks */}
      {task.status === 'failed' && task.error_message && (
        <div className="mt-3 p-2.5 rounded-lg bg-danger-500/8 border border-danger-500/15 text-xs text-danger-400/80 leading-relaxed">
          {task.error_message}
        </div>
      )}
    </div>
  );
}

// ── Stage Icons ─────────────────────────────────────────────
const uploadIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const parseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const embedIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
  </svg>
);

const analyseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const doneIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
