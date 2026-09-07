import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowLeft, ListFilter, PenLine } from "lucide-react";
import { SubmissionForm } from "@/components/SubmissionForm";
import { SubmissionCard, type PublicSubmission } from "@/components/SubmissionCard";
import { EmptyState, Spinner } from "@/components/ui";
import type { CategoryConfig } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function SectionPage({ category }: { category: CategoryConfig }) {
  const published = useQuery(api.submissions.listPublished, { category: category.key });
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);

  const items = useMemo(() => {
    if (!published) return [];
    const rows = published as unknown as PublicSubmission[];
    if (typeFilter === "all") return rows;
    return rows.filter((r) => r.type === typeFilter);
  }, [published, typeFilter]);

  return (
    <div className="animate-fade-up">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-700/50">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, ${category.glow[0]}, transparent 40%), radial-gradient(circle at 80% 80%, ${category.glow[1]}, transparent 50%)`,
          }}
        />
        <div className="container-app relative py-14 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <span className="chip mb-4 !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
              <category.icon className="h-3.5 w-3.5" />
              قسم {category.label}
            </span>
            <h1 className="section-title leading-tight text-cream">
              {category.hero.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="gold-text">{category.hero.split(" ").slice(-1)}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
              {category.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => setShowForm((s) => !s)} className="btn-gold">
                {showForm ? (
                  <>
                    <ListFilter className="h-4 w-4" />
                    عرض المنشورات
                  </>
                ) : (
                  <>
                    <PenLine className="h-4 w-4" />
                    سجّل بياناتك الآن
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container-app py-10">
        {showForm ? (
          <div className="mx-auto max-w-3xl">
            <SubmissionForm category={category} />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-extrabold text-cream">
                المنشورات المعتمدة في قسم {category.label}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                    typeFilter === "all"
                      ? "bg-gold-500 text-ink-950"
                      : "border border-ink-600/60 text-ink-300 hover:border-gold-500/50"
                  )}
                >
                  الكل
                </button>
                {category.types.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTypeFilter(t.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                      typeFilter === t.value
                        ? "bg-gold-500 text-ink-950"
                        : "border border-ink-600/60 text-ink-300 hover:border-gold-500/50"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {!published ? (
              <div className="flex justify-center py-16 text-gold-400">
                <Spinner className="h-8 w-8" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                title="لا توجد منشورات معتمدة بعد"
                hint="كن أول من يسجل — تُراجع الطلبات وتُنشر فور اعتمادها من الإدارة"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <SubmissionCard key={item._id} item={item} />
                ))}
              </div>
            )}

            <button
              onClick={() => setShowForm(true)}
              className="btn-ghost mx-auto mt-10 flex"
            >
              <ArrowLeft className="h-4 w-4" />
              سجّل في قسم {category.label}
            </button>
          </>
        )}
      </div>
    </div>
  );
}