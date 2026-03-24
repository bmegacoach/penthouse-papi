"use client";

import { useState, useEffect } from "react";
import { Database, Bot, Key } from "lucide-react";

interface Settings {
  supabase_url: string;
  supabase_anon_key: string;
  openfang_url: string;
  openfang_api_key: string;
  openai_key: string;
  claude_key: string;
}

const DEFAULT_SETTINGS: Settings = {
  supabase_url: "",
  supabase_anon_key: "",
  openfang_url: "http://localhost:4200",
  openfang_api_key: "",
  openai_key: "",
  claude_key: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Partial<Settings>) => {
        setSettings((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, []);

  function update(key: keyof Settings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const sections = [
    {
      title: "Supabase Connection",
      icon: Database,
      fields: [
        {
          label: "Project URL",
          stateKey: "supabase_url" as keyof Settings,
          placeholder: "https://xxxxx.supabase.co",
        },
        {
          label: "Anon Key",
          stateKey: "supabase_anon_key" as keyof Settings,
          placeholder: "eyJ...",
        },
      ],
    },
    {
      title: "OpenFang",
      icon: Bot,
      fields: [
        {
          label: "Base URL",
          stateKey: "openfang_url" as keyof Settings,
          placeholder: "http://localhost:4200",
        },
        {
          label: "API Key",
          stateKey: "openfang_api_key" as keyof Settings,
          placeholder: "Bearer token",
        },
      ],
    },
    {
      title: "API Keys",
      icon: Key,
      fields: [
        {
          label: "OpenAI (Whisper)",
          stateKey: "openai_key" as keyof Settings,
          placeholder: "sk-...",
        },
        {
          label: "Claude / OpenRouter",
          stateKey: "claude_key" as keyof Settings,
          placeholder: "sk-ant-...",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="fade-up fade-up-1">
        <h1 className="text-2xl font-bold tracking-tight text-pp-text">
          Settings
        </h1>
        <p className="mt-1 text-sm text-pp-muted">
          Configure connections, keys, and preferences
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section, i) => (
          <div
            key={section.title}
            className={`fade-up fade-up-${i + 2} rounded-xl border border-pp-border bg-pp-surface p-5`}
          >
            <div className="mb-4 flex items-center gap-2">
              <section.icon className="h-4 w-4 text-pp-purple" />
              <h3 className="text-sm font-semibold text-pp-text">
                {section.title}
              </h3>
            </div>
            <div className="space-y-3">
              {section.fields.map((field) => (
                <div key={field.label} className="space-y-1">
                  <label className="text-xs font-medium text-pp-muted">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={settings[field.stateKey]}
                    onChange={(e) => update(field.stateKey, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text placeholder:text-pp-muted/40 focus:border-pp-purple/50 focus:outline-none focus:ring-1 focus:ring-pp-purple/30"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fade-up fade-up-6 flex items-center justify-end gap-4">
        {saved && (
          <span className="text-sm font-medium text-green-400 transition-opacity">
            Saved!
          </span>
        )}
        <button
          onClick={handleSave}
          className="rounded-lg bg-pp-purple px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-pp-purple/90 glow-purple"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
