import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import type { Task, ResumeResult, ResumeContextType } from '../types';
import { resumeApi } from '../services/api';
import { useAuth } from './AuthContext';

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 3000;

export function ResumeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [results, setResults] = useState<Record<string, ResumeResult>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Track active polling intervals so we can clean them up
  const pollingRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // ── Cleanup all polling on unmount ────────────────────────
  useEffect(() => {
    return () => {
      pollingRefs.current.forEach((interval) => clearInterval(interval));
      pollingRefs.current.clear();
    };
  }, []);

  // ── Stop polling for a specific task ──────────────────────
  const stopPolling = useCallback((taskId: string) => {
    const interval = pollingRefs.current.get(taskId);
    if (interval) {
      clearInterval(interval);
      pollingRefs.current.delete(taskId);
    }
  }, []);

  // ── Fetch result for a completed task ─────────────────────
  const fetchResult = useCallback(async (taskId: string): Promise<ResumeResult> => {
    const result = await resumeApi.getResult(taskId);
    setResults((prev) => ({ ...prev, [taskId]: result }));
    return result;
  }, []);

  // ── Start polling for a task ──────────────────────────────
  const startPolling = useCallback(
    (taskId: string) => {
      // Don't double-poll
      if (pollingRefs.current.has(taskId)) return;

      const interval = setInterval(async () => {
        try {
          const updatedTask = await resumeApi.getTask(taskId);
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? updatedTask : t))
          );

          if (updatedTask.status === 'completed') {
            stopPolling(taskId);
            // Auto-fetch the result
            try {
              await fetchResult(taskId);
            } catch {
              // Result fetch failed — task is still marked completed
            }
          } else if (updatedTask.status === 'failed') {
            stopPolling(taskId);
          }
        } catch {
          // Network error during poll — silently continue
        }
      }, POLL_INTERVAL_MS);

      pollingRefs.current.set(taskId, interval);
    },
    [stopPolling, fetchResult]
  );

  // ── Fetch all tasks ───────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const taskList = await resumeApi.listTasks();
      setTasks(taskList);

      // Start polling for any active tasks
      for (const task of taskList) {
        if (task.status === 'queued' || task.status === 'processing') {
          startPolling(task.id);
        }
      }

      // Fetch results for completed tasks
      const completedTasks = taskList.filter((t) => t.status === 'completed');
      const resultPromises = completedTasks.map(async (task) => {
        try {
          const result = await resumeApi.getResult(task.id);
          return [task.id, result] as [string, ResumeResult];
        } catch {
          return null;
        }
      });

      const fetched = await Promise.all(resultPromises);
      const newResults: Record<string, ResumeResult> = {};
      for (const entry of fetched) {
        if (entry) {
          newResults[entry[0]] = entry[1];
        }
      }
      setResults((prev) => ({ ...prev, ...newResults }));
    } finally {
      setIsLoadingTasks(false);
    }
  }, [startPolling]);

  // ── Upload a resume ───────────────────────────────────────
  const uploadResume = useCallback(
    async (file: File): Promise<Task> => {
      setIsUploading(true);
      try {
        const task = await resumeApi.upload(file);
        setTasks((prev) => [task, ...prev]);
        startPolling(task.id);
        return task;
      } finally {
        setIsUploading(false);
      }
    },
    [startPolling]
  );

  // ── Remove a task from local state ────────────────────────
  const deleteTask = useCallback(
    (taskId: string) => {
      stopPolling(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setResults((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    },
    [stopPolling]
  );

  // ── Auto-fetch tasks when authenticated ───────────────────
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    } else {
      setTasks([]);
      setResults({});
      pollingRefs.current.forEach((interval) => clearInterval(interval));
      pollingRefs.current.clear();
    }
  }, [isAuthenticated, fetchTasks]);

  return (
    <ResumeContext.Provider
      value={{
        tasks,
        results,
        isUploading,
        isLoadingTasks,
        fetchTasks,
        uploadResume,
        fetchResult,
        deleteTask,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume(): ResumeContextType {
  const ctx = useContext(ResumeContext);
  if (!ctx) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return ctx;
}
