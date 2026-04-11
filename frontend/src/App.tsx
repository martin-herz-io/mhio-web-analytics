import { useEffect, useState } from "react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import {
  IconAdjustmentsHorizontal,
  IconChartBar,
  IconChevronDown,
  IconLoader2,
  IconSearch,
} from "@tabler/icons-react";

import { ApiDocs } from "./components/docs/ApiDocs";
import { AnalysisResults, AnalysisResultsSkeleton, type AnalyzeResponse } from "./components/results/AnalysisResults";
import { Button } from "./components/ui/Button";
import { SelectInput } from "./components/ui/SelectInput";
import { SwitchInput } from "./components/ui/Switch";
import { TextInput } from "./components/ui/TextInput";
import type { Locale } from "./lib/i18n";
import { t } from "./lib/i18n";

const UI_LOCALE_STORAGE_KEY = "mhio-ui-locale";

type PerformanceStrategy = "mobile" | "desktop";
type AppView = "home" | "docs";

function useLabel(locale: Locale) {
  return (key: Parameters<typeof t>[1]) => t(locale, key);
}

function readStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const savedLocale = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
  return savedLocale === "de" ? "de" : "en";
}

export function App() {
  const [uiLocale, setUiLocale] = useState<Locale>(readStoredLocale);
  const [view, setView] = useState<AppView>("home");
  const [url, setUrl] = useState("https://example.com");
  const [singlePageOnly, setSinglePageOnly] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [maxPages, setMaxPages] = useState("10");
  const [includePerformance, setIncludePerformance] = useState(false);
  const [performanceStrategy, setPerformanceStrategy] = useState<PerformanceStrategy>("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const label = useLabel(uiLocale);

  useEffect(() => {
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, uiLocale);
  }, [uiLocale]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = singlePageOnly ? "/analyze" : "/analyze/site";
    const payload: Record<string, unknown> = {
      url,
      locale: uiLocale,
      includePerformance,
      performanceStrategy,
    };

    if (!singlePageOnly) {
      payload.maxPages = Number(maxPages) || 10;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`${label("requestFailed")} ${response.status}`);
      }

      const payloadResult = (await response.json()) as AnalyzeResponse;
      setResult(payloadResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : label("unknownError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-4 md:px-8">
        <header className="mb-8 flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="inline-flex items-center gap-3">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              <IconChartBar size={16} className="text-zinc-500" />
              mhio Web Analytics
            </div>
            <nav className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
              <button
                type="button"
                onClick={() => setView("home")}
                className={`h-7 cursor-pointer rounded-md px-3 text-xs transition-colors ${
                  view === "home" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label("navHome")}
              </button>
              <button
                type="button"
                onClick={() => setView("docs")}
                className={`h-7 cursor-pointer rounded-md px-3 text-xs transition-colors ${
                  view === "docs" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label("navDocs")}
              </button>
            </nav>
          </div>
          <div className="w-32">
            <SelectInput
              value={uiLocale}
              onChange={(value) => setUiLocale(value as Locale)}
              size="sm"
              options={[
                { value: "en", label: "English" },
                { value: "de", label: "Deutsch" },
              ]}
            />
          </div>
        </header>

        {view === "home" ? (
          <section className="mx-auto w-full max-w-4xl">
            <div className="mb-8 text-center">
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-100 md:text-5xl">
                mhio Web Analytics
              </h1>
              <p className="mt-3 text-sm text-zinc-400 md:text-base">{label("appSubtitle")}</p>
            </div>

            <form onSubmit={submit}>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-[0_0_0_1px_rgba(24,24,27,0.2)]">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <TextInput
                    id="target-url"
                    label={label("targetUrl")}
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com"
                    required
                  />
                  <Button
                    type="submit"
                    className="mt-6 h-12 min-w-36"
                    leftIcon={loading ? <IconLoader2 size={16} className="animate-spin" /> : <IconSearch size={16} />}
                    disabled={loading}
                  >
                    {loading ? label("analyzing") : label("analyze")}
                  </Button>
                </div>

                <BaseAccordion.Root
                  value={advancedOpen ? ["advanced"] : []}
                  onValueChange={(value) => setAdvancedOpen(value.includes("advanced"))}
                  className="mt-4 border-t border-zinc-800 pt-3"
                >
                  <BaseAccordion.Item value="advanced">
                    <div className="flex items-center justify-between gap-3">
                      <SwitchInput
                        checked={singlePageOnly}
                        onChange={setSinglePageOnly}
                        label={label("singlePageOnly")}
                      />

                      <BaseAccordion.Header>
                        <BaseAccordion.Trigger
                          type="button"
                          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs font-medium uppercase tracking-wide text-zinc-300 transition-colors hover:bg-zinc-800"
                        >
                          <IconAdjustmentsHorizontal size={14} className="text-zinc-500" />
                          {label("advanced")}
                          <IconChevronDown size={14} className="text-zinc-500" />
                        </BaseAccordion.Trigger>
                      </BaseAccordion.Header>
                    </div>

                    <BaseAccordion.Panel className="grid gap-4 pt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <SelectInput
                          label={label("performanceStrategy")}
                          value={performanceStrategy}
                          onChange={(value) => setPerformanceStrategy(value as PerformanceStrategy)}
                          options={[
                            { value: "mobile", label: label("strategyMobile") },
                            { value: "desktop", label: label("strategyDesktop") },
                          ]}
                        />

                        {!singlePageOnly ? (
                          <TextInput
                            label={label("maxPages")}
                            inputMode="numeric"
                            value={maxPages}
                            onChange={(event) => setMaxPages(event.target.value.replace(/[^\d]/g, ""))}
                          />
                        ) : (
                          <div className="hidden md:block" />
                        )}
                      </div>

                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          checked={includePerformance}
                          onChange={(event) => setIncludePerformance(event.target.checked)}
                          className="h-4 w-4 cursor-pointer rounded border-zinc-700 bg-zinc-950 text-zinc-100 accent-zinc-200"
                        />
                        <span className="inline-flex items-center gap-2">
                          <IconAdjustmentsHorizontal size={15} className="text-zinc-500" />
                          {label("includePerformance")}
                        </span>
                      </label>
                    </BaseAccordion.Panel>
                  </BaseAccordion.Item>
                </BaseAccordion.Root>
              </div>
            </form>

            {error ? (
              <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
            ) : null}

            <section className="mt-8 border-t border-zinc-900 pt-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">{label("result")}</h2>

              {loading && !result ? (
                <AnalysisResultsSkeleton label={label} />
              ) : !result ? (
                <p className="mt-4 text-sm text-zinc-500">{label("noResultHint")}</p>
              ) : (
                <AnalysisResults result={result} label={label} />
              )}
            </section>
          </section>
        ) : (
          <ApiDocs label={label} />
        )}

        <footer className="mt-auto pt-8 text-center text-xs text-zinc-600">
          <span>v{__APP_VERSION__}</span>
          <span className="mx-2">•</span>
          <span>{label("credits")}</span>
          <span className="mx-2">•</span>
          <a
            href="https://github.com/martin-herz-io/mhio-web-analytics"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-200 hover:underline"
          >
            {label("githubRepository")}
          </a>
        </footer>
      </div>
    </main>
  );
}
