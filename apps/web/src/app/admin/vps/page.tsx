"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Server,
  Activity,
  Terminal,
  RefreshCw,
  Zap,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Cpu,
  Database,
  Wifi,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { VpsRealtimeMonitorGraphic } from "@/components/charts/VpsRealtimeMonitorGraphic";

export default function AdminVpsPage() {
  const [selectedLogTab, setSelectedLogTab] = useState<string>("all");
  const [logSearch, setLogSearch] = useState("");

  const sampleLogs = [
    { time: "20:01:42", proc: "brandos-api", level: "INFO", msg: "GET /system/metrics - 200 OK (2ms)" },
    { time: "20:01:40", proc: "caddy", level: "INFO", msg: "HTTP/2 TLS handshake completed from client 169.58.227.157" },
    { time: "20:01:38", proc: "brandos-web", level: "INFO", msg: "Next.js 16.3 Turbopack dynamic rendering /dashboard/gsc - 200 OK" },
    { time: "20:01:32", proc: "brandos-worker", level: "INFO", msg: "BullMQ queue [aeo-scan]: heartbeat ping 0 active jobs" },
    { time: "20:01:25", proc: "brandos-api", level: "INFO", msg: "Prisma connection pool active: 5 idle, 1 active connection" },
    { time: "20:01:10", proc: "brandos-postgres", level: "INFO", msg: "PostgreSQL 16 checkpoint complete; write 128 MB, sync 2ms" },
    { time: "20:00:58", proc: "brandos-redis", level: "INFO", msg: "Redis 7 memory defragmentation pass completed; 28MB used" },
  ];

  const filteredLogs = sampleLogs.filter((l) => {
    if (selectedLogTab !== "all" && l.proc !== selectedLogTab) return false;
    if (logSearch && !l.msg.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-500/10">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <span>VPS Realtime Health & Telemetry</span>
                <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-bold text-purple-300 border border-purple-500/30">
                  Ubuntu 22.04 LTS
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                High-frequency hardware telemetry, rolling CPU/RAM waveforms, and microservices status for <strong className="text-white">169.58.227.157</strong> (brandoseye.com)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <span>Control Center</span>
          </Link>
          <a
            href="https://brandoseye.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition"
          >
            <span>Visit Live Site</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Main Graph & Telemetry Suite */}
      <VpsRealtimeMonitorGraphic pollIntervalMs={2000} showServices={true} />

      {/* Live System Event Log & Command Console */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Live System Daemon Stream</h3>
            <span className="text-xs text-slate-400 font-mono">({filteredLogs.length} events)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by process */}
            <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-[11px] font-semibold">
              {["all", "brandos-api", "brandos-web", "brandos-worker", "caddy"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedLogTab(p)}
                  className={`px-2 py-0.5 rounded-md transition ${
                    selectedLogTab === p ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search daemon logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="p-4 font-mono text-xs space-y-1.5 bg-slate-950/70 max-h-64 overflow-y-auto">
          {filteredLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-3 py-0.5 text-slate-300 hover:bg-slate-900/50 rounded px-1 transition">
              <span className="text-slate-500 text-[11px] select-none shrink-0">{log.time}</span>
              <span className="rounded bg-purple-500/10 px-1.5 py-0.2 text-[10px] font-bold text-purple-400 border border-purple-500/20 shrink-0">
                {log.proc}
              </span>
              <span className={`text-[10px] font-bold shrink-0 ${log.level === "INFO" ? "text-emerald-400" : "text-amber-400"}`}>
                [{log.level}]
              </span>
              <span className="truncate">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
