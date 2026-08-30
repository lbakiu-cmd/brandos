export type TimeRangeKey = "7D" | "14D" | "1M" | "3M" | "MAX";

export interface TimeRangeOption {
  key: TimeRangeKey;
  label: string;
  shortLabel: string;
  days: number;
  multiplier: number; // Base reference is 1 Month (1.0)
}

export const DEFAULT_TIME_RANGE: TimeRangeKey = "7D";

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { key: "7D", label: "One Week", shortLabel: "1W", days: 7, multiplier: 0.25 },
  { key: "14D", label: "Two Weeks", shortLabel: "2W", days: 14, multiplier: 0.5 },
  { key: "1M", label: "One Month", shortLabel: "1M", days: 30, multiplier: 1.0 },
  { key: "3M", label: "3 Months", shortLabel: "3M", days: 90, multiplier: 3.0 },
  { key: "MAX", label: "Max", shortLabel: "Max", days: 365, multiplier: 12.0 },
];

export function getTimeRangeMultiplier(key: TimeRangeKey | string): number {
  switch (key) {
    case "7D":
    case "1W":
    case "One Week":
      return 0.25;
    case "14D":
    case "2W":
    case "Two Weeks":
      return 0.5;
    case "1M":
    case "28D":
    case "30D":
    case "One Month":
      return 1.0;
    case "3M":
    case "90D":
    case "3 Months":
      return 3.0;
    case "MAX":
    case "12M":
    case "Max":
    case "All Time":
      return 12.0;
    default:
      return 1.0;
  }
}

export function getTimeRangeLabel(key: TimeRangeKey | string): string {
  const opt = TIME_RANGE_OPTIONS.find(
    (o) => o.key === key || o.label.toLowerCase() === key?.toLowerCase()
  );
  return opt ? opt.label : "One Month";
}

export function getTimeRangeDays(key: TimeRangeKey | string): number {
  const opt = TIME_RANGE_OPTIONS.find(
    (o) => o.key === key || o.label.toLowerCase() === key?.toLowerCase()
  );
  return opt ? opt.days : 30;
}
