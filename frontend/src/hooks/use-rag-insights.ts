import { useRef, useState } from "react";

import {
  fetchHoverInsights,
  type HoverInsightJob,
  type HoverInsightsResponse,
  type HoverResumeMeta,
} from "@/lib/hover-rag-service";
import { getApiErrorMessage } from "@/lib/auth-service";

interface UseRagInsightsOptions {
  enabled: boolean;
  token: string | null;
  resumeMeta?: HoverResumeMeta;
  hoverDelay?: number;
}

export function useRagInsights({
  enabled,
  token,
  resumeMeta,
  hoverDelay = 350,
}: UseRagInsightsOptions) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [pinnedJobId, setPinnedJobId] = useState<string | null>(null);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [insightsByJob, setInsightsByJob] = useState<Record<string, HoverInsightsResponse>>({});
  const [errorsByJob, setErrorsByJob] = useState<Record<string, string>>({});

  const hoverTimerRef = useRef<number | null>(null);
  const fetchedJobIdsRef = useRef(new Set<string>());

  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const requestInsights = (job: HoverInsightJob) => {
    if (!token) {
      return;
    }

    if (fetchedJobIdsRef.current.has(job.id) || loadingJobId === job.id) {
      return;
    }

    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(async () => {
      setLoadingJobId(job.id);

      try {
        const result = await fetchHoverInsights(job, token, resumeMeta);
        setInsightsByJob((current) => ({ ...current, [job.id]: result }));
        fetchedJobIdsRef.current.add(job.id);
        setErrorsByJob((current) => {
          const next = { ...current };
          delete next[job.id];
          return next;
        });
      } catch (error) {
        setErrorsByJob((current) => ({
          ...current,
          [job.id]: getApiErrorMessage(error, "Unable to load AI job insights."),
        }));
      } finally {
        setLoadingJobId((current) => (current === job.id ? null : current));
      }
    }, hoverDelay);
  };

  const handleHover = (job: HoverInsightJob, event: React.MouseEvent<HTMLElement>, moveOnly = false) => {
    if (!enabled || !token) {
      return;
    }

    if (pinnedJobId && pinnedJobId !== job.id) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setCursorPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });

    if (moveOnly) {
      return;
    }

    setActiveJobId(job.id);
    requestInsights(job);
  };

  const handleLeave = () => {
    if (pinnedJobId) {
      return;
    }
    clearHoverTimer();
    setActiveJobId(null);
  };

  const togglePinned = (job: HoverInsightJob, event?: React.MouseEvent<HTMLElement>) => {
    if (!enabled || !token) {
      return;
    }

    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      setCursorPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }

    if (pinnedJobId === job.id) {
      setPinnedJobId(null);
      setActiveJobId(null);
      return;
    }

    setPinnedJobId(job.id);
    setActiveJobId(job.id);
    requestInsights(job);
  };

  const clearPinned = () => {
    setPinnedJobId(null);
    setActiveJobId(null);
  };

  const clearCache = () => {
    fetchedJobIdsRef.current.clear();
    setInsightsByJob({});
    setErrorsByJob({});
    setLoadingJobId(null);
  };

  return {
    activeJobId,
    pinnedJobId,
    loadingJobId,
    cursorPosition,
    insightsByJob,
    errorsByJob,
    handleHover,
    handleLeave,
    togglePinned,
    clearPinned,
    clearCache,
  };
}
