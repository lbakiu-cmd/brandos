"use client";

import Link from "next/link";
import { Radar, X } from "lucide-react";
import { TimeRangeKey } from "@/lib/timeRanges";

interface AeoWidgetProps {
  data?: any;
  onRemove?: () => void;
  initialTimeRange?: TimeRangeKey;
}

export function AeoWidget({ onRemove }: AeoWidgetProps) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Radar className="h-4 w-4 shrink-0" /> Assistant Citation Share
        </h3>
        {onRemove && <button onClick={onRemove} title="Remove widget" aria-label="Remove widget" className="p-2 text-zinc-400 hover:text-red-400"><X className="h-4 w-4" /></button>}
      </div>
      <p className="text-sm text-zinc-400">Citation measurements unavailable.</p>
      <Link href="/dashboard/visibility" className="text-sm text-emerald-400 hover:underline">View visibility</Link>
    </div>
  );
}
