"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Business = {
  id: string;
  name: string;
  city: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
};

const FIELDS: Array<{ key: keyof Business; label: string; hint?: string }> = [
  { key: "name", label: "Business name" },
  { key: "city", label: "City", hint: "Used in AI Visibility prompts" },
  { key: "industry", label: "Industry", hint: "Used in AI Visibility prompts" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Contact email" },
];

export default function SettingsPage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<Business>("/business")
      .then((b) => {
        const f: Record<string, string> = {};
        for (const field of FIELDS) f[field.key] = (b[field.key] as string) ?? "";
        setForm(f);
      })
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    try {
      await apiFetch("/business", { method: "PATCH", body: JSON.stringify(form) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-8 text-3xl font-bold text-blue-400">Settings</h1>

      <div className="max-w-xl rounded-2xl bg-slate-800 p-6">
        <div className="space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-sm text-slate-300">
                {field.label}
                {field.hint && (
                  <span className="ml-2 text-[10px] text-slate-500">{field.hint}</span>
                )}
              </label>
              <input
                value={form[field.key] ?? ""}
                onChange={(e) =>
                  setForm({ ...form, [field.key]: e.target.value })
                }
                className="w-full rounded-lg bg-slate-700 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Save changes
          </button>
          {saved && <span className="text-sm text-green-400">✔ Saved</span>}
        </div>
      </div>
    </main>
  );
}