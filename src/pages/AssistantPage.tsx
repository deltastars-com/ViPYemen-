import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Sparkles,
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
import { PLATFORM_WHATSAPP_LINK } from "@/lib/utils";

const FAQS = [
  {
    q: "كيف أنشر إعلاني في المنصة؟",
    a: "سجّل بياناتك في القسم المناسب (توظيف / عقارات / تسويق إلكتروني / برمجيات)، ثم تُراجع بياناتك من إدارة المنصة في لوحة التحكم، وبعد التدقيق والتعديل يُنشر إعلانك تلقائياً على واجهة المنصة وقنوات التواصل.",
  },
  {
    q: "هل بياناتي تظهر للجميع فور التسجيل؟",
    a: "لا — بياناتك تصل أولاً إلى لوحة التحكم بشكل خاص ومستقل وسري للمراجعة والتدقيق، ولا تظهر على الواجهة إلا بعد الاعتماد والنشر من الإدارة.",
  },
  {
    q: "كيف أتواصل مع إدارة المنصة؟",
    a: "عبر واتساب 00967711780999 أو البريد vipservicesyemen@gmail.com — وتتواصل معك الإدارة مباشرة عند الحاجة لضمان الجودة.",
  },
  {
    q: "هل التحقق من رقم الهاتف إلزامي؟",
    a: "نعم — في قسم التسويق الإلكتروني يتأكد النظام من صحة الرقم عبر رمز تحقق يُرسل عبر واتساب المنصة، ويُوثَّق الرقم في بياناتك.",
  },
  {
    q: "كيف أعرف أن المنتج تم بيعه؟",
    a: "أي منتج يُباع تضع عليه الإدارة إشارة «تم البيع» من داخل لوحة التحكم وتظهر فوراً على الإعلان في الواجهة.",
  },
  {
    q: "هل يمكن تثبيت المنصة كتطبيق؟",
    a: "نعم — المنصة تطبيق ويب تقدمي (PWA) يمكن تثبيته على هاتفك ويعمل حتى بدون إنترنت، بالإضافة إلى إصدارات Android وiOS في قسم الإصدارات.",
  },
];

export function AssistantPage() {
  const [query, setQuery] = useState("");
  const [wikiResults, setWikiResults] = useState<{ title: string; snippet: string; url: string }[] | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiSearched, setWikiSearched] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
              <Sparkles className="h-3.5 w-3.5" />
              المساعد الذكي
            </span>
            <h1 className="section-title mt-4 text-cream">
              محرك بحث <span className="gold-text">معرفي شامل</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-300">
              ابحث في كل ما يخص المنصة: المنشورات، العروض، الإعلانات، والأسئلة
              الشائعة — أو ابحث عن أي معلومة عامة عبر البحث الموسوعي.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runWikiSearch();
              }}
              className="mx-auto mt-8 flex max-w-2xl gap-2"
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="اكتب سؤالك أو كلمة البحث... مثال: شقة في حدة، جوال للبيع، برمجة تطبيقات"
                className="!py-3.5 !text-base"
              />
              <Button type="submit" className="shrink-0" loading={wikiLoading}>
                {wikiLoading ? null : <Search className="h-4 w-4" />}
                بحث
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      <section className="container-app py-10">
        {!q ? (
          <>
            <h2 className="mb-6 text-lg font-extrabold text-cream">الأسئلة الشائعة</h2>
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
                نتائج في المنصة ({listingResults.length + offerResults.length + adMatches.length})
              </h2>
              {listingResults.length === 0 && offerResults.length === 0 && adMatches.length === 0 ? (
                <EmptyState title="لا توجد نتائج مطابقة في المنصة" hint="جرّب كلمات أخرى أو ابحث في الموسوعة العامة أدناه" />
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
              <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-cream">
                <Globe className="h-5 w-5 text-gold-400" />
                البحث الموسوعي العام (Wikipedia)
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
                        rel="noreferrer"
                        className="card-surface card-surface-hover block p-4"
                      >
                        <p className="text-sm font-extrabold text-gold-300">{r.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-300">{r.snippet}</p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="لا توجد نتائج في الموسوعة العامة" />
                )
              ) : (
                <p className="text-sm text-ink-300">
                  اضغط زر «بحث» أعلاه ليبحث المساعد في الموسوعة العامة أيضاً.
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
            لم تجد ما تبحث عنه؟ تواصل مع فريق المنصة مباشرة — يسعدنا مساعدتك
            في أي استفسار.
          </p>
          <a href={PLATFORM_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="btn-gold">
            <MessageCircle className="h-4 w-4" />
            تواصل معنا عبر واتساب
          </a>
        </div>
      </section>
    </div>
  );
}