import { X, Loader2 } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

export function Button({
  variant = "gold",
  className,
  loading,
  disabled,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gold" | "ghost" | "danger" | "success";
  loading?: boolean;
}) {
  const styles = {
    gold: "btn-gold",
    ghost: "btn-ghost",
    danger:
      "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition-all hover:bg-rose-500/20 active:scale-[0.98] disabled:opacity-50",
    success:
      "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/25 active:scale-[0.98] disabled:opacity-50",
  } as const;
  return (
    <button
      className={cn(styles[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("input-app", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("input-app min-h-24 resize-y", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("input-app", props.className)} />;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn("label-app", className)}>{children}</label>;
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("card-surface", className)}>{children}</div>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-ink-600/60 bg-ink-900 shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-700/60 bg-ink-900/95 px-5 py-3.5 backdrop-blur">
          <h3 className="text-base font-bold text-gold-300">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-ink-800 hover:text-cream"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-600/60 py-14 text-center">
      <p className="text-sm font-bold text-ink-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "gold",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "gold" | "sky" | "emerald" | "amber" | "violet" | "rose";
}) {
  const accents: Record<string, string> = {
    gold: "text-gold-300 bg-gold-500/10 border-gold-500/25",
    sky: "text-sky-300 bg-sky-500/10 border-sky-500/25",
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/25",
    violet: "text-violet-300 bg-violet-500/10 border-violet-500/25",
    rose: "text-rose-300 bg-rose-500/10 border-rose-500/25",
  };
  return (
    <div className="card-surface flex items-center gap-4 p-4">
      {icon && (
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", accents[accent])}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-cream">{value}</p>
        <p className="truncate text-xs font-semibold text-ink-300">{label}</p>
      </div>
    </div>
  );
}