import { BadgeCheck, Crown, MessageCircle, PlayCircle } from "lucide-react";
import { Badge, Card } from "./ui";
import { whatsappLink } from "@/lib/utils";

export interface PublicOffer {
  _id: string;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  originalPrice?: number;
  offerPrice?: number;
  discountPercent?: number;
  isFeatured: boolean;
  createdAt: number;
}

export function OfferCard({ offer }: { offer: PublicOffer }) {
  return (
    <Card
      className={`card-surface-hover overflow-hidden ${
        offer.isFeatured ? "border-gold-500/50 shadow-[0_8px_40px_-12px_rgba(212,175,55,0.3)]" : ""
      }`}
    >
      {offer.imageUrl && (
        <a href={offer.imageUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={offer.imageUrl}
            alt={offer.title}
            loading="lazy"
            className="h-44 w-full object-cover"
          />
        </a>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-cream">{offer.title}</h3>
          {offer.isFeatured && (
            <Badge className="shrink-0 border-gold-500/40 bg-gold-500/15 text-gold-300">
              <Crown className="h-3 w-3" />
              عرض مميز
            </Badge>
          )}
        </div>
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-ink-300">
          {offer.description}
        </p>
        {offer.discountPercent ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1 text-xs font-black text-rose-300">
              <BadgeCheck className="h-3.5 w-3.5" />
              خصم {offer.discountPercent}%
            </span>
          </div>
        ) : null}
        {offer.offerPrice !== undefined && (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-black text-gold-300">
              {offer.offerPrice.toLocaleString("en-US")} ريال
            </span>
            {offer.originalPrice !== undefined && (
              <span className="text-xs font-bold text-ink-400 line-through">
                {offer.originalPrice.toLocaleString("en-US")}
              </span>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {offer.videoUrl && (
            <a
              href={offer.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600/60 px-3 py-1.5 text-[11px] font-black text-ink-200 transition-colors hover:border-gold-500/50 hover:text-gold-300"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              شاهد الفيديو
            </a>
          )}
          <a
            href={whatsappLink("00967711780999", `مرحباً، أنا مهتم بالعرض "${offer.title}" على منصة ViP Yemen`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366]/15 px-3 py-1.5 text-[11px] font-black text-[#4ade80] transition-colors hover:bg-[#25d366]/25"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            اطلب العرض
          </a>
        </div>
      </div>
    </Card>
  );
}