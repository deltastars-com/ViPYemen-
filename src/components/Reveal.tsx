import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ✨ ظهور لطيف بلا مكتبات — بديل خفيف لـ framer-motion في الواجهة العامة.
 *
 * يستخدم IntersectionObserver + انتقال CSS (opacity/transform فقط، على
 * الـGPU)، فلا يُضيف أي كيلوبايت إلى الحزمة الأولية ولا يحجب الخيط الرئيسي.
 * هذا يخفض JavaScript غير المستخدم ويُسرّع LCP في الصفحة الرئيسية.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  /** true للسections الظاهرة فوق الطية: تُظهر فوراً بلا انتظار التمرير. */
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // احترام تقليل الحركة + دعم المتصفحات القديمة: أظهر مباشرة.
    const reduce =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.classList.contains("reduced-motion"));
    if (immediate || reduce || typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  return (
    <div
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
