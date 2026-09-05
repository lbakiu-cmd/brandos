"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { TIME_RANGE_OPTIONS, TimeRangeKey, TimeRangeOption } from "@/lib/timeRanges";

interface TimeRangeFilterProps {
  value: TimeRangeKey;
  onChange: (value: TimeRangeKey) => void;
  variant?: "segmented" | "compact" | "dropdown";
  size?: "xs" | "sm" | "md";
  accentColor?: "blue" | "amber" | "emerald" | "indigo" | "purple";
  showIcon?: boolean;
}

export function TimeRangeFilter({
  value,
  onChange,
  variant = "segmented",
  size = "sm",
  accentColor = "blue",
  showIcon = false,
}: TimeRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeOption =
    TIME_RANGE_OPTIONS.find((o) => o.key === value) || TIME_RANGE_OPTIONS[2]; // Default 1M

  const activeColorClasses: Record<string, string> = {
    blue: "bg-blue-600 text-white shadow-sm shadow-blue-500/20",
    amber: "bg-amber-600 text-white shadow-sm shadow-amber-500/20",
    emerald: "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20",
    indigo: "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20",
    purple: "bg-purple-600 text-white shadow-sm shadow-purple-500/20",
  };

  const badgeColorClasses: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  };

  const activeBg = activeColorClasses[accentColor] || activeColorClasses.blue;
  const badgeCls = badgeColorClasses[accentColor] || badgeColorClasses.blue;

  // Segmented control button group
  if (variant === "segmented") {
    return (
      <div className="flex items-center rounded-xl bg-slate-900/90 border border-slate-800 p-1 text-xs sm:text-sm font-semibold shadow-inner">
        {showIcon && <Calendar className="h-4 w-4 text-slate-400 ml-1.5 mr-1" />}
        {TIME_RANGE_OPTIONS.map((range) => {
          const isSelected = value === range.key;
          return (
            <button
              key={range.key}
              type="button"
              onClick={() => onChange(range.key)}
              className={`rounded-lg px-2.5 sm:px-3 py-1.5 min-h-[34px] flex items-center justify-center transition-all duration-150 ${
                isSelected
                  ? activeBg
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <span className="hidden sm:inline">{range.label}</span>
              <span className="sm:hidden">{range.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact Pill / Dropdown for Widget Cards
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800/80 hover:text-white hover:border-slate-700 shadow-sm min-h-[32px] ${
          isOpen ? "border-slate-700 bg-slate-800/90 text-white" : ""
        }`}
      >
        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span>{activeOption.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-48 origin-top-right rounded-xl border border-slate-800 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
            Filter Time Window
          </div>
          <div className="space-y-0.5">
            {TIME_RANGE_OPTIONS.map((opt) => {
              const isSelected = value === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onChange(opt.key);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition text-left ${
                    isSelected
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
