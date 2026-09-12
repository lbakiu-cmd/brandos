"use client";

import { useState, useEffect } from "react";
import { Download, ChevronDown, Check, Sparkles, ExternalLink, X, Layers } from "lucide-react";

interface VersionItem {
  version: string;
  releasedAt?: string;
  filename?: string;
  sizeFormatted?: string;
  sha256?: string;
  status?: string;
  changelog?: string[];
}

interface VersionRegistry {
  latest: string;
  name: string;
  description?: string;
  versions: VersionItem[];
}

export function VersionSwitchBadge({
  variant = "dark",
  showPortalSwitch = false,
  currentPortal = "admin", // "admin" | "workspace"
}: {
  variant?: "dark" | "glass";
  showPortalSwitch?: boolean;
  currentPortal?: "admin" | "workspace";
}) {
  const [registry, setRegistry] = useState<VersionRegistry | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("1.6.3");
  const [isOpen, setIsOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    fetch("/versions.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VersionRegistry) => {
        if (data && data.latest) {
          setRegistry(data);
          setSelectedVersion(data.latest);
        }
      })
      .catch(() => {
        // Fallback static registry
        setRegistry({
          latest: "1.6.3",
          name: "aivision-seo",
          versions: [
            {
              version: "1.6.3",
              status: "stable",
              sizeFormatted: "67.2 KB",
              changelog: [
                "Native WordPress Core automatic updates integration.",
                "Background WP-Cron auto-updates enabled.",
                "Remote push auto-installer via REST API.",
                "1-Click update checker in Settings.",
              ],
            },
            {
              version: "1.6.2",
              status: "archived",
              sizeFormatted: "62.9 KB",
              changelog: ["Dynamic version badges in admin UI.", "UI rebranding."],
            },
            {
              version: "1.6.1",
              status: "archived",
              sizeFormatted: "62.7 KB",
              changelog: ["AIVisibility SEO rebranding.", "Telemetry sync."],
            },
            {
              version: "1.6.0",
              status: "archived",
              sizeFormatted: "62.7 KB",
              changelog: ["Autonomous 1-click audit remediation.", "Content autopilot sync."],
            },
          ],
        });
      });
  }, []);

  const activeVersionMeta = registry?.versions?.find((v) => v.version === selectedVersion) || {
    version: selectedVersion,
    status: "stable",
    sizeFormatted: "67.2 KB",
  };

  const copyChecksum = (hash?: string) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Portal Switcher Tabs */}
      {showPortalSwitch && (
        <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 shadow-inner max-w-full text-xs font-semibold">
          <a
            href="/login"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              currentPortal === "workspace"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🏢 Workspace Login</span>
          </a>
          <a
            href="/admin/login"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              currentPortal === "admin"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🛡️ Super Admin Portal</span>
          </a>
        </div>
      )}

      {/* Interactive Version Switch Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group inline-flex items-center gap-2 rounded-full bg-slate-950/90 hover:bg-slate-900 border border-purple-500/30 hover:border-purple-400/60 px-3 py-1 text-xs text-slate-300 transition shadow-sm shadow-purple-900/20"
        title="Click to view release history and switch versions"
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[11px] font-mono font-bold text-white">
          v{selectedVersion}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wide text-purple-300/80 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
          {selectedVersion === registry?.latest ? "Latest" : "Switch"}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-white transition" />
      </button>

      {/* Version Switcher Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl border border-purple-900/40 bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Release &amp; Version Switcher</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Live v{registry?.latest || "1.6.3"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select a version to inspect release notes or download its distribution archive.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Version List */}
            <div className="space-y-3">
              {(registry?.versions || []).map((v) => {
                const isSelected = v.version === selectedVersion;
                const isLatest = v.version === registry?.latest;

                return (
                  <div
                    key={v.version}
                    className={`rounded-2xl border p-4 transition ${
                      isSelected
                        ? "border-purple-500/60 bg-purple-950/20 shadow-lg shadow-purple-900/10"
                        : "border-slate-800/80 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedVersion(v.version)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                            isSelected
                              ? "bg-purple-600 text-white"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          v{v.version}
                        </button>
                        {isLatest && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            ★ Latest Release
                          </span>
                        )}
                        {v.sizeFormatted && (
                          <span className="text-xs text-slate-500 font-mono">
                            {v.sizeFormatted}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`/aivision-seo-v${v.version}.zip`}
                          download={`aivision-seo-v${v.version}.zip`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition"
                          title={`Download aivision-seo-v${v.version}.zip`}
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>.zip</span>
                        </a>
                      </div>
                    </div>

                    {/* Changelog Bullets */}
                    {v.changelog && v.changelog.length > 0 && (
                      <ul className="text-xs text-slate-400 space-y-1 pl-4 list-disc mt-2 border-t border-slate-800/60 pt-2">
                        {v.changelog.slice(0, 4).map((item, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    {v.sha256 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span className="truncate max-w-[280px]">
                          SHA256: {v.sha256.slice(0, 16)}…
                        </span>
                        <button
                          type="button"
                          onClick={() => copyChecksum(v.sha256)}
                          className="text-purple-400 hover:text-purple-300 underline text-[10px]"
                        >
                          {copiedHash === v.sha256 ? "Copied!" : "Copy Full Hash"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <a
                href="/api/wordpress/plugin-versions"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-purple-300 transition"
              >
                <span>Raw Registry JSON</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-md shadow-purple-600/30"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
