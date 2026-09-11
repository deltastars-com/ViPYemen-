import { useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { knowledgeAI } from "@/lib/gemini";
import { useQuery } from "convex/react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Briefcase,
  Home,
  ShoppingBag,
  Code2,
  Crown,
  Megaphone,
  MessageCircle,
  Globe,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import { Button, EmptyState, Input } from "@/components/ui";
import { SubmissionCard, type PublicSubmission } from "@/components/SubmissionCard";
import { OfferCard, type PublicOffer } from "@/components/OfferCard";
import { useLang } from "@/lib/i18n";
import { PLATFORM_WHATSAPP_LINK } from "@/lib/utils";

/** Turn raw engine errors into short, human-friendly messages. */
function friendlyAiError(raw: string, t: (k: string) => string): string {
  const m = (raw || "").toLowerCase();
  if (/vite_gemini_key|مفتاح/.test(m)) return t("aiErrorKey");
  if (/404|لم يعد متاحاً|no longer available/.test(m)) return t("aiError404");
  if (/401|403|api key|خطأ من الخادم|permission/i.test(m)) return t("aiErrorAuth");
  if (/فشل الاتصال|failed to fetch|networkerror|internet|offline/.test(m)) return t("aiErrorOffline");
  return t("aiErrorDefault");
}

function useFaqs(t: (k: string) => string) {
  return [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
    { q: t("faq6Q"), a: t("faq6A") },
  ];
}

export function AssistantPage() {
  const { t } = useLang();
  const FAQS = useFaqs(t);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [wikiResults, setWikiResults] = useState<{ title: string; snippet: string; url: string }[] | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiSearched, setWikiSearched] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const runWikiSearchRef = useRef(runWikiSearch);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<"gemini" | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const jobs = useQuery(api.submissions.listPublished, { category: "jobs" });
  const realEstate = useQuery(api.submissions.listPublished, { category: "real_estate" });
  const emarket = useQuery(api.submissions.listPublished, { category: "emarket" });
  const software = useQuery(api.submissions.listPublished, { category: "software" });
  const offers = useQuery(api.offers.listPublished);
  const ads = useQuery(api.ads.listActive);

  const allListings = useMemo(() => {
    return [
      ...((jobs ?? []) as unknown as PublicSubmission[]),
      ...((realEstate ?? []) as unknown as PublicSubmission[]),
      ...((emarket ?? []) as unknown as PublicSubmission[]),
      ...((software ?? []) as unknown as PublicSubmission[]),
    ];
  }, [jobs, realEstate, emarket, software]);

  const q = query.trim().toLowerCase();

  const listingResults = useMemo(() => {
    if (!q) return [];
    return allListings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q) ||
        l.fullName.toLowerCase().includes(q) ||
        JSON.stringify(l.fields ?? {}).toLowerCase().includes(q)
    );
  }, [allListings, q]);

  const offerResults = useMemo(() => {
    if (!q) return [];
    return ((offers ?? []) as unknown as PublicOffer[]).filter(
      (o) => o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q)
    );
  }, [offers, q]);

  const adMatches = useMemo(() => {
    if (!q) return [];
    return ((ads ?? []) as any[]).filter(
      (a) => a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q)
    );
  }, [ads, q]);

  useEffect(() => {
    // Pre-fill from ?q= (structured-data SearchAction) and auto-search
    const initial = searchParams.get("q");
    if (initial) runWikiSearchRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runWikiSearch() {
    if (!q) return;
    setWikiLoading(true);
    setWikiSearched(true);
    setWikiResults(null);
    try {
      const res = await fetch(
        `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          query
        )}&format=json&origin=*&srlimit=5`
      );
      const data = await res.json();
      const results = (data?.query?.search ?? []).map((r: any) => ({
        title: r.title,
        snippet: r.snippet.replace(/<[^>]+>/g, ""),
        url: `https://ar.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      }));
      setWikiResults(results);
    } catch {
      setWikiResults([]);
    } finally {
      setWikiLoading(false);
    }
  }

  async function runAiAnswer() {
    if (!q) return;
    setAiLoading(true);
    setAiError(null);
    setAiAnswer(null);
    setAiProvider(null);
    try {
      const result = await knowledgeAI.answer(query);
      if ("error" in result) {
        setAiError(result.error);
      } else {
        setAiAnswer(result.text ?? "");
        setAiProvider(result.provider);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : t("aiErrorUnexpected"));
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <section className="relative overflow-hidden border-b border-ink-700/50">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.35), transparent 55%)",
          }}
        />
        <div className="container-app relative py-14 text-center sm:py-18">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="chip mx-auto !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
              <Search className="h-3.5 w-3.5" />
              {t("assistantBadge")}
            </span>
            <h1 className="section-title mt-4 text-cream">
              {t("assistantTitle1")} <span className="gold-text">{t("assistantTitle2")}</span>
            </h1>
            <div className="section-title-underline section-title-underline-center" />
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-300">
              {t("aiSearchDesc")} <b className="mx-1 text-gold-300">Gemini AI</b> {t("aiEngineLabel")}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runWikiSearch();
                runAiAnswer();
              }}
              className="mx-auto mt-8 flex max-w-2xl gap-2"
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="!py-3.5 !text-base"
              />
              <Button type="submit" className="shrink-0" loading={wikiLoading}>
                {wikiLoading ? null : <Search className="h-4 w-4" />}
                {t("search")}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      <section className="container-app py-10">
        {!q ? (
          <>
            <h2 className="mb-6 text-lg font-extrabold text-cream">{t("faqs")}</h2>
            <div className="mx-auto max-w-3xl space-y-3">
              {FAQS.map((f, i) => (
                <div key={i} className="card-surface overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right"
                  >
                    <span className="text-sm font-extrabold text-cream">{f.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-gold-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i && (
                    <p className="border-t border-ink-700/50 px-5 py-4 text-[13px] leading-relaxed text-ink-300">
                      {f.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-10">
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-cream">
                <Megaphone className="h-5 w-5 text-gold-400" />
                {t("platformResults")} ({listingResults.length + offerResults.length + adMatches.length})
              </h2>
              {listingResults.length === 0 && offerResults.length === 0 && adMatches.length === 0 ? (
                <EmptyState title={t("noPlatformResults")} hint={t("noPlatformResultsHint")} />
              ) : (
                <>
                  {listingResults.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {listingResults.slice(0, 9).map((item) => (
                        <SubmissionCard key={item._id} item={item} />
                      ))}
                    </div>
                  )}
                  {offerResults.length > 0 && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {offerResults.map((o) => (
                        <OfferCard key={o._id} offer={o} />
                      ))}
                    </div>
                  )}
                  {adMatches.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {adMatches.map((a) => (
                        <div key={a._id} className="card-surface flex items-center gap-3 px-4 py-3 text-sm">
                          <Crown className="h-4 w-4 shrink-0 text-gold-400" />
                          <div>
                            <b className="text-cream">{a.title}</b>
                            <p className="text-xs text-ink-300">{a.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              {aiLoading && (
                <div className="flex justify-center py-6 text-gold-400">
                  <Loader2 className="h-7 w-7 animate-spin" />
                  <span className="ml-3 text-sm">{t("aiSearching")}</span>
                </div>
              )}
              {aiError && (
                <div className="card-surface rounded-xl border border-rose-500/30 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-rose-300">
                    <Megaphone className="h-4 w-4 shrink-0" />
                    {friendlyAiError(aiError, t)}
                  </p>
                  <p className="mt-2 text-xs text-ink-300">{t("aiUseEncyclopedia")}</p>
                  <button
                    onClick={() => runAiAnswer()}
                    disabled={aiLoading}
                    className="btn-gold mt-3 !px-4 !py-2 text-xs"
                  >
                    {t("aiRetry")}
                  </button>
                </div>
              )}
              {aiAnswer && (
                <div className="card-surface rounded-xl border border-gold-500/25 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-gold-300">
                      <Crown className="h-4 w-4" />
                      {t("aiAnswerLabel")}
                    </h3>
                    {aiProvider && (
                      <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-black text-violet-300">
                        {t("aiEngine")} Gemini AI
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-ink-200">{aiAnswer}</p>
                </div>
              )}

              <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-cream">
                <Globe className="h-5 w-5 text-gold-400" />
                {t("encyclopediaSearch")}
              </h2>
              {wikiSearched ? (
                wikiLoading ? (
                  <div className="flex justify-center py-8 text-gold-400">
                    <Loader2 className="h-7 w-7 animate-spin" />
                  </div>
                ) : wikiResults && wikiResults.length > 0 ? (
                  <div className="mx-auto max-w-3xl space-y-3">
                    {wikiResults.map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card-surface card-surface-hover block p-4"
                      >
                        <p className="text-sm font-extrabold text-gold-300">{r.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-300">{r.snippet}</p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <EmptyState title={t("encyclopediaEmpty")} />
                )
              ) : (
                <p className="text-sm text-ink-300">
                  {t("encyclopediaHint")}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-gold-500/25 bg-gold-500/5 p-8 text-center">
          <div className="flex items-center gap-2">
            {[Briefcase, Home, ShoppingBag, Code2, Crown].map((Icon, i) => (
              <span key={i} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold-500/30 bg-ink-900 text-gold-300">
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
          <p className="max-w-md text-sm leading-relaxed text-ink-300">
            {t("notFoundSearch")}
          </p>
          <a href={PLATFORM_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="btn-gold">
            <MessageCircle className="h-4 w-4" />
            {t("contactViaWa")}
          </a>
        </div>
      </section>
    </div>
  );
}