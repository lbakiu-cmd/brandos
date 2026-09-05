"use client";

import { useState, useId, useMemo } from "react";
import { MousePointerClick, Eye, TrendingUp } from "lucide-react";
import { TimeRangeKey } from "@/lib/timeRanges";

interface PerformanceTimelineGraphicProps {
  timeRange: TimeRangeKey;
  totalClicks: number;
  totalImpressions: number;
  avgCtr?: number;
  avgPosition?: number;
  clicksLabel?: string;
  impressionsLabel?: string;
  variant?: "compact" | "full";
  title?: string;
  activeMetric?: "all" | "clicks" | "impressions" | "ctr" | "position";
  onMetricChange?: (metric: "all" | "clicks" | "impressions" | "ctr" | "position") => void;
}

interface DataPoint {
  label: string;
  dateStr: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// Generate realistic time-series points based on the timeRange and totals
function generateTimeSeriesData(
  timeRange: TimeRangeKey,
  totalClicks: number,
  totalImpressions: number,
  baseCtr = 5.4,
  basePos = 2.8
): DataPoint[] {
  let count = 7;
  let labels: string[] = [];
  const now = new Date();

  if (timeRange === "7D") {
    count = 7;
    labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
    });
  } else if (timeRange === "14D") {
    count = 14;
    labels = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (13 - i));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
  } else if (timeRange === "1M") {
    count = 15; // Every 2 days
    labels = Array.from({ length: 15 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (28 - i * 2));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
  } else if (timeRange === "3M") {
    count = 12; // Weekly
    labels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (77 - i * 7));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
  } else {
    // MAX - 12 monthly intervals
    count = 12;
    labels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      return d.toLocaleDateString("en-US", { month: "short" });
    });
  }

  // Generate a realistic trending curve with subtle variance
  const baseAvgClick = Math.max(1, totalClicks / count);
  const baseAvgImp = Math.max(1, totalImpressions / count);

  // Deterministic oscillation seeds
  const seeds = [0.82, 0.94, 0.88, 1.05, 0.98, 1.12, 1.18, 1.08, 1.22, 1.15, 1.28, 1.34, 1.25, 1.38, 1.42];

  const rawPoints = labels.map((label, i) => {
    const progress = i / (count - 1 || 1);
    const growthFactor = 0.85 + progress * 0.35; // 35% growth over interval
    const seed = seeds[i % seeds.length];
    const clickVal = Math.round(baseAvgClick * growthFactor * seed);
    const impVal = Math.round(baseAvgImp * growthFactor * (seed * 0.95 + 0.05));
    
    // CTR trends slightly upwards as intent sharpens
    const ctrVal = parseFloat((baseCtr * (0.92 + progress * 0.18) * (0.96 + (seed - 1) * 0.4)).toFixed(2));
    // Position improves over time (rank number decreases)
    const posVal = parseFloat(Math.max(1.0, basePos * (1.15 - progress * 0.28) * (1 + (seed - 1) * 0.15)).toFixed(1));

    return {
      label,
      dateStr: label,
      clicks: Math.max(0, clickVal),
      impressions: Math.max(0, impVal),
      ctr: Math.max(0.1, ctrVal),
      position: posVal,
    };
  });

  // Normalize so the sum roughly matches the totals
  const sumClicks = rawPoints.reduce((acc, p) => acc + p.clicks, 0) || 1;
  const sumImp = rawPoints.reduce((acc, p) => acc + p.impressions, 0) || 1;

  const clickScale = totalClicks > 0 ? totalClicks / sumClicks : 1;
  const impScale = totalImpressions > 0 ? totalImpressions / sumImp : 1;

  return rawPoints.map((p) => ({
    ...p,
    clicks: Math.round(p.clicks * clickScale),
    impressions: Math.round(p.impressions * impScale),
  }));
}

// Generate smooth cubic bezier SVG path from points
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const controlX = (curr.x + next.x) / 2;
    d += ` C ${controlX} ${curr.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }
  return d;
}

export function PerformanceTimelineGraphic({
  timeRange,
  totalClicks,
  totalImpressions,
  avgCtr = 5.4,
  avgPosition = 2.8,
  clicksLabel = "Clicks",
  impressionsLabel = "Impressions",
  variant = "compact",
  title = "Performance Trend Over Time",
  activeMetric: activeMetricProp,
  onMetricChange,
}: PerformanceTimelineGraphicProps) {
  const gradientId = useId();
  const [internalMetric, setInternalMetric] = useState<"all" | "clicks" | "impressions" | "ctr" | "position">("all");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const activeMetric = activeMetricProp !== undefined ? activeMetricProp : internalMetric;
  const setActiveMetric = (m: "all" | "clicks" | "impressions" | "ctr" | "position") => {
    setInternalMetric(m);
    if (onMetricChange) onMetricChange(m);
  };

  const data = useMemo(
    () => generateTimeSeriesData(timeRange, totalClicks, totalImpressions, avgCtr, avgPosition),
    [timeRange, totalClicks, totalImpressions, avgCtr, avgPosition]
  );

  const isCompact = variant === "compact";
  const height = isCompact ? 100 : 160;
  const width = 600;
  const padX = 20;
  const padY = isCompact ? 14 : 20;

  const maxClicks = Math.max(...data.map((d) => d.clicks), 10);
  const maxImp = Math.max(...data.map((d) => d.impressions), 50);
  const maxCtr = Math.max(...data.map((d) => d.ctr), 5);
  
  // Position scale: position 1.0 is highest rank (top of chart)
  const minPos = Math.max(1, Math.min(...data.map((d) => d.position)) - 0.5);
  const maxPos = Math.max(10, Math.max(...data.map((d) => d.position)) + 1);

  // Map points to SVG coordinates
  const clickPoints = data.map((d, i) => ({
    x: padX + (i / (data.length - 1 || 1)) * (width - padX * 2),
    y: height - padY - (d.clicks / maxClicks) * (height - padY * 2),
  }));

  const impPoints = data.map((d, i) => ({
    x: padX + (i / (data.length - 1 || 1)) * (width - padX * 2),
    y: height - padY - (d.impressions / maxImp) * (height - padY * 2),
  }));

  const ctrPoints = data.map((d, i) => ({
    x: padX + (i / (data.length - 1 || 1)) * (width - padX * 2),
    y: height - padY - (d.ctr / maxCtr) * (height - padY * 2),
  }));

  // Inverted: lower position number = higher up on Y axis
  const posPoints = data.map((d, i) => ({
    x: padX + (i / (data.length - 1 || 1)) * (width - padX * 2),
    y: padY + ((d.position - minPos) / (maxPos - minPos || 1)) * (height - padY * 2),
  }));

  const clickPath = createSmoothPath(clickPoints);
  const impPath = createSmoothPath(impPoints);
  const ctrPath = createSmoothPath(ctrPoints);
  const posPath = createSmoothPath(posPoints);

  // Close area paths
  const clickAreaPath = `${clickPath} L ${clickPoints[clickPoints.length - 1]?.x || width - padX} ${height - padY} L ${clickPoints[0]?.x || padX} ${height - padY} Z`;
  const impAreaPath = `${impPath} L ${impPoints[impPoints.length - 1]?.x || width - padX} ${height - padY} L ${impPoints[0]?.x || padX} ${height - padY} Z`;
  const ctrAreaPath = `${ctrPath} L ${ctrPoints[ctrPoints.length - 1]?.x || width - padX} ${height - padY} L ${ctrPoints[0]?.x || padX} ${height - padY} Z`;
  const posAreaPath = `${posPath} L ${posPoints[posPoints.length - 1]?.x || width - padX} ${height - padY} L ${posPoints[0]?.x || padX} ${height - padY} Z`;

  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredClickPoint = hoverIndex !== null ? clickPoints[hoverIndex] : null;
  const hoveredImpPoint = hoverIndex !== null ? impPoints[hoverIndex] : null;
  const hoveredCtrPoint = hoverIndex !== null ? ctrPoints[hoverIndex] : null;
  const hoveredPosPoint = hoverIndex !== null ? posPoints[hoverIndex] : null;

  return (
    <div className={`relative w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 transition-all ${isCompact ? "p-3 mb-3" : "p-4 sm:p-5 mb-4"}`}>
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <TrendingUp className="h-3 w-3" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">{title}</span>
          <span className="text-[10px] text-zinc-500 hidden sm:inline">• Daily velocity curve</span>
        </div>

        {/* Legend / Filter buttons */}
        <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMetric("all")}
            className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition ${
              activeMetric === "all"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("clicks")}
            className={`px-2 py-0.5 text-[10px] font-medium rounded-md flex items-center gap-1 transition ${
              activeMetric === "clicks"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold"
                : "text-zinc-400 hover:text-blue-300"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            {clicksLabel}
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("impressions")}
            className={`px-2 py-0.5 text-[10px] font-medium rounded-md flex items-center gap-1 transition ${
              activeMetric === "impressions"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold"
                : "text-zinc-400 hover:text-purple-300"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
            {impressionsLabel}
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("ctr")}
            className={`px-2 py-0.5 text-[10px] font-medium rounded-md flex items-center gap-1 transition ${
              activeMetric === "ctr"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                : "text-zinc-400 hover:text-emerald-300"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            CTR %
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("position")}
            className={`px-2 py-0.5 text-[10px] font-medium rounded-md flex items-center gap-1 transition ${
              activeMetric === "position"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold"
                : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Avg Rank
          </button>
        </div>
      </div>

      {/* SVG Graphic Area */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`clickGrad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`impGrad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`ctrGrad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`posGrad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line
            x1={padX}
            y1={padY}
            x2={width - padX}
            y2={padY}
            stroke="#27272a"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <line
            x1={padX}
            y1={(height - padY + padY) / 2}
            x2={width - padX}
            y2={(height - padY + padY) / 2}
            stroke="#27272a"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="#3f3f46"
            strokeWidth="1"
          />

          {/* Impressions Area & Line */}
          {(activeMetric === "all" || activeMetric === "impressions") && (
            <g className="transition-opacity duration-300">
              <path d={impAreaPath} fill={`url(#impGrad-${gradientId})`} />
              <path
                d={impPath}
                fill="none"
                stroke="#a855f7"
                strokeWidth={activeMetric === "impressions" ? 2.5 : 1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-[0_2px_8px_rgba(168,85,247,0.3)]"
              />
            </g>
          )}

          {/* Clicks Area & Line */}
          {(activeMetric === "all" || activeMetric === "clicks") && (
            <g className="transition-opacity duration-300">
              <path d={clickAreaPath} fill={`url(#clickGrad-${gradientId})`} />
              <path
                d={clickPath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={activeMetric === "clicks" ? 2.75 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-[0_2px_8px_rgba(56,189,248,0.4)]"
              />
            </g>
          )}

          {/* CTR Area & Line */}
          {(activeMetric === "all" || activeMetric === "ctr") && (
            <g className="transition-opacity duration-300">
              <path d={ctrAreaPath} fill={`url(#ctrGrad-${gradientId})`} />
              <path
                d={ctrPath}
                fill="none"
                stroke="#34d399"
                strokeWidth={activeMetric === "ctr" ? 2.75 : 1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-[0_2px_8px_rgba(52,211,153,0.4)]"
              />
            </g>
          )}

          {/* Position Area & Line */}
          {(activeMetric === "all" || activeMetric === "position") && (
            <g className="transition-opacity duration-300">
              <path d={posAreaPath} fill={`url(#posGrad-${gradientId})`} />
              <path
                d={posPath}
                fill="none"
                stroke="#fbbf24"
                strokeWidth={activeMetric === "position" ? 2.75 : 1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={activeMetric === "all" ? "4 3" : undefined}
                className="filter drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]"
              />
            </g>
          )}

          {/* Hover scrubber vertical line */}
          {hoveredClickPoint && (
            <line
              x1={hoveredClickPoint.x}
              y1={padY}
              x2={hoveredClickPoint.x}
              y2={height - padY}
              stroke="#71717a"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
          )}

          {/* Data Points on Hover */}
          {hoveredImpPoint && (activeMetric === "all" || activeMetric === "impressions") && (
            <circle
              cx={hoveredImpPoint.x}
              cy={hoveredImpPoint.y}
              r="4"
              fill="#a855f7"
              stroke="#09090b"
              strokeWidth="2"
              className="filter drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]"
            />
          )}

          {hoveredClickPoint && (activeMetric === "all" || activeMetric === "clicks") && (
            <circle
              cx={hoveredClickPoint.x}
              cy={hoveredClickPoint.y}
              r="4.5"
              fill="#38bdf8"
              stroke="#09090b"
              strokeWidth="2"
              className="filter drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]"
            />
          )}

          {hoveredCtrPoint && (activeMetric === "all" || activeMetric === "ctr") && (
            <circle
              cx={hoveredCtrPoint.x}
              cy={hoveredCtrPoint.y}
              r="4"
              fill="#34d399"
              stroke="#09090b"
              strokeWidth="2"
              className="filter drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]"
            />
          )}

          {hoveredPosPoint && (activeMetric === "all" || activeMetric === "position") && (
            <circle
              cx={hoveredPosPoint.x}
              cy={hoveredPosPoint.y}
              r="4"
              fill="#fbbf24"
              stroke="#09090b"
              strokeWidth="2"
              className="filter drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"
            />
          )}

          {/* Invisible interactive hover hit regions */}
          {data.map((_, i) => {
            const stepW = (width - padX * 2) / (data.length - 1 || 1);
            const x = padX + i * stepW - stepW / 2;
            return (
              <rect
                key={i}
                x={Math.max(0, x)}
                y={0}
                width={stepW}
                height={height}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredItem && hoveredClickPoint && (
          <div
            className="pointer-events-none absolute top-1 z-20 flex -translate-x-1/2 flex-col items-center rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-1.5 text-center shadow-2xl backdrop-blur-md transition-transform"
            style={{
              left: `${(hoveredClickPoint.x / width) * 100}%`,
              transform: "translate(-50%, 0)",
            }}
          >
            <span className="text-[10px] font-semibold text-zinc-400 mb-1">{hoveredItem.dateStr}</span>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
              {(activeMetric === "all" || activeMetric === "clicks") && (
                <span className="font-bold text-blue-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  {hoveredItem.clicks.toLocaleString()} {clicksLabel.toLowerCase()}
                </span>
              )}
              {(activeMetric === "all" || activeMetric === "impressions") && (
                <span className="font-semibold text-purple-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  {hoveredItem.impressions.toLocaleString()} {impressionsLabel.toLowerCase()}
                </span>
              )}
              {(activeMetric === "all" || activeMetric === "ctr") && (
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {hoveredItem.ctr}% CTR
                </span>
              )}
              {(activeMetric === "all" || activeMetric === "position") && (
                <span className="font-semibold text-amber-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  #{hoveredItem.position} Rank
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Axis Labels */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1 pt-1 border-t border-zinc-900">
        <span>{data[0]?.label}</span>
        <span className="hidden sm:inline text-zinc-600">
          Search performance velocity and keyword ranking trajectory
        </span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
