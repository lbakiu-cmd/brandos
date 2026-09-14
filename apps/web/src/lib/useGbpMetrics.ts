"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getTimeRangeDays, TimeRangeKey } from "@/lib/timeRanges";

export function useGbpMetrics(timeRange: TimeRangeKey) {
  const [result, setResult] = useState<{ range: TimeRangeKey; data: any; error: string | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setResult(null);
    const days = timeRange === "MAX" ? 0 : getTimeRangeDays(timeRange);
    apiFetch<any>(`/integrations/google/gbp?days=${days}`)
      .then(data => {
        if (data?.isLiveOAuth !== true) throw new Error("Unverified analytics response");
        if (!cancelled) setResult({ range: timeRange, data, error: null });
      })
      .catch(() => {
        if (!cancelled) setResult({ range: timeRange, data: null, error: "Google Business Profile data is unavailable for this period." });
      });
    return () => { cancelled = true; };
  }, [timeRange]);
  const current = result?.range === timeRange ? result : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: current === null };
}
