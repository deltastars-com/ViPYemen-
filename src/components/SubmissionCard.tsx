import { MessageCircle, Phone, BadgeCheck, ImageIcon, FileText, CheckCircle2 } from "lucide-react";
import { Badge, Card } from "./ui";
import { getCategory, getType, TYPE_ICONS, PRODUCT_ICONS } from "@/lib/categories";
import { formatPrice, whatsappLink } from "@/lib/utils";

export interface PublicSubmission {
  _id: string;
  _creationTime: number;
  category: string;
  type: string;
  status: string;
  title: string;
  description?: string;
  fullName: string;
  phone: string;
  address?: string;
  price?: number;
  currency?: string;
  fields: Record<string, string>;
  attachments: { name: string; kind: string; url: string | null }[];
  phoneVerified: boolean;
  publishedAt?: number;
  soldAt?: number;
  createdAt: number;
}

export function SubmissionCard({ item }: { item: PublicSubmission }) {
  const category = getCategory(item.category);
  const typeConfig = getType(category, item.type);
  const isSold = item.status === "sold";
  const TypeIcon = TYPE_ICONS[item.type] ?? category.icon;

  return (
    <Card className={`card-surface-hover relative overflow-hidden p-5 ${isSold ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
            <TypeIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold leading-snug text-cream">{item.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge className="border-ink-600/60 bg-ink-800/60 text-ink-200">{typeConfig.label}</Badge>
              {category.key === "emarket" && (
                <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                  {item.fields?.productType ?? "سلعة"}
                </Badge>
              )}
              {item.price !== undefined && (
                <Badge className="border-gold-500/30 bg-gold-500/10 text-gold-300">
                  {formatPrice(item.price, item.currency)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {isSold && (
          <div className="flex flex-col items-center gap-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <span className="text-[10px] font-black text-sky-300">تم البيع</span>
          </div>
        )}
      </div>

      {item.description && (
        <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-ink-300">{item.description}</p>
      )}

      {typeConfig.fields.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {typeConfig.fields.map((f) => {
            const val = item.fields?.[f.name];
            if (!val) return null;
            return (
              <span key={f.name} className="chip">
                {f.label}: <b className="text-cream">{val}</b>
              </span>
            );
          })}
          {item.address && (
            <span className="chip">
              العنوان: <b className="text-cream">{item.address}</b>
            </span>
          )}
        </div>
      )}

      {item.attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.attachments.map((a, i) =>
            a.kind === "image" && a.url ? (
              <a key={i} href={a.url} target="_blank" rel="noreferrer">
                <img
                  src={a.url}
                  alt={a.name}
                  loading="lazy"
                  className="h-16 w-16 rounded-lg border border-ink-600/50 object-cover transition-transform hover:scale-105"
                />
              </a>
            ) : (
              <a
                key={i}
                href={a.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-ink-600/50 bg-ink-800/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-200 transition-colors hover:border-gold-500/50"
              >
                {a.kind === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                {a.name}
              </a>
            )
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-700/50 pt-3">
        <div className="flex items-center gap-2 text-xs text-ink-300">
          <span className="font-bold text-cream">{item.fullName}</span>
          {item.phoneVerified && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" />
              رقم موثق
            </span>
          )}
          {typeConfig.showPhoneOnCard && item.phone && (
            <span className="flex items-center gap-1 text-[11px]" dir="ltr">
              <Phone className="h-3 w-3 text-gold-400" />
              {item.phone}
            </span>
          )}
        </div>
        <a
          href={whatsappLink(
            typeConfig.showPhoneOnCard && item.phone ? item.phone : "00967711780999",
            `مرحباً، أنا مهتم بـ "${item.title}" المنشور على منصة ViP Yemen`
          )}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366]/15 px-3 py-1.5 text-[11px] font-black text-[#4ade80] transition-colors hover:bg-[#25d366]/25"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          تواصل عبر واتساب
        </a>
      </div>
    </Card>
  );
}