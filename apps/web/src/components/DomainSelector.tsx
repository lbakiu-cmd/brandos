"use client";

import { useEffect, useState, useRef } from "react";
import { Globe, ChevronDown, Check, RefreshCw, ExternalLink, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface GscSite {
  siteUrl: string;
  domain: string;
  permissionLevel: string;
  isSelected?: boolean;
}

export function DomainSelector() {
  const [sites, setSites] = useState<GscSite[]>([]);
  const [currentDomain, setCurrentDomain] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadSites() {
      try {
        const res = await apiFetch<{ sites: GscSite[]; currentWebsite?: string }>("/integrations/google/sites");
        if (res?.sites && res.sites.length > 0) {
          setSites(res.sites);
          const active = res.sites.find((s) => s.isSelected) || res.sites[0];
          setCurrentDomain(active.domain);
        } else if (res?.currentWebsite) {
          const clean = res.currentWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "");
          setCurrentDomain(clean);
        }
      } catch (err) {
        console.error("Failed to load Google sites:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSites();

    // Close on click outside
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectDomain = async (site: GscSite) => {
    setSwitching(true);
    setCurrentDomain(site.domain);
    setIsOpen(false);

    try {
      await apiFetch("/integrations/select-site", {
        method: "POST",
        body: JSON.stringify({ siteUrl: site.siteUrl, domain: site.domain }),
      });

      // Notify other components and reload
      window.dispatchEvent(new CustomEvent("brandos:domain-changed", { detail: site }));
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch domain:", err);
    } finally {
      setSwitching(false);
    }
  };

  if (loading && !currentDomain) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
        <span>Loading domains...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:border-blue-500/50 hover:bg-slate-850 focus:outline-none"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
          <Globe className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[10px] text-slate-400 font-medium">Active Monitored Domain</span>
          <span className="font-bold text-white flex items-center gap-1.5">
            {currentDomain || "Select a Domain"}
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Connected Google Domains ({sites.length})
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1 space-y-1">
            {sites.map((s) => {
              const isCurrent = currentDomain === s.domain;
              return (
                <button
                  key={s.siteUrl}
                  onClick={() => handleSelectDomain(s)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition ${
                    isCurrent
                      ? "bg-blue-600/15 text-blue-300 font-bold border border-blue-500/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Globe className={`h-4 w-4 shrink-0 ${isCurrent ? "text-blue-400" : "text-slate-500"}`} />
                    <span className="truncate">{s.domain}</span>
                  </div>
                  {isCurrent && <Check className="h-4 w-4 text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="mt-2 border-t border-slate-800 pt-2 px-2">
            <a
              href="/dashboard/integrations"
              className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/10 transition"
            >
              <span>Manage Connected Accounts</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
