import { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  KeyRound,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import { Button, Card, Input, Label } from "@/components/ui";
import { LogoMark } from "@/components/Logo";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/convex";

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/admin";
  const navigate = useNavigate();

  const login = useMutation(api.users.login);
  const changePassword = useMutation(api.users.changePassword);
  const requestReset = useAction(api.users.requestPasswordReset);
  const resetPassword = useMutation(api.users.resetPassword);
  const seedAdmin = useMutation(api.users.seedAdmin);
  const adminExists = useQuery(api.users.adminExists);
  const session = useQuery(api.users.getSession, { token: getAdminToken() });

  const [mode, setMode] = useState<"login" | "reset" | "change">("login");
  const [email, setEmail] = useState("vipservicesyemen@gmail.com");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const mustChange = useMemo(
    () => session?.mustChangePassword === true,
    [session]
  );

  useEffect(() => {
    if (adminExists === false) {
      seedAdmin().catch(() => {});
    }
  }, [adminExists, seedAdmin]);

  useEffect(() => {
    if (session && !mustChange) navigate(returnTo, { replace: true });
  }, [session, mustChange, navigate, returnTo]);

  useEffect(() => {
    if (mustChange) setMode("change");
  }, [mustChange]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await login({ email, password });
      setAdminToken(res.token);
      if (res.mustChangePassword) {
        setMode("change");
      } else {
        navigate(returnTo, { replace: true });
      }
    } catch (err: any) {
      setError(err.message ?? "خطأ في تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  }

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setBusy(true);
    try {
      await changePassword({
        token: getAdminToken(),
        currentPassword: password,
        newPassword,
      });
      setSuccess("تم تغيير كلمة المرور بنجاح — جارٍ الدخول...");
      setTimeout(() => navigate(returnTo, { replace: true }), 900);
    } catch (err: any) {
      setError(err.message ?? "تعذر تغيير كلمة المرور");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setDevCode(null);
    setBusy(true);
    try {
      const res = await requestReset({ email });
      if (res.delivered) {
        setSuccess("تم إرسال رمز الاستعادة إلى بريدك الإلكتروني — تحقق من صندوق الوارد");
      } else {
        setDevCode(res.devCode);
        setSuccess("تعذر إرسال البريد حالياً (لم يُضبط مفتاح الإرسال) — استخدم رمز الطوارئ أدناه");
      }
    } catch (err: any) {
      setError(err.message ?? "تعذر إرسال رمز الاستعادة");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setBusy(true);
    try {
      await resetPassword({ email, code: resetCode, newPassword });
      setSuccess("تم تعيين كلمة المرور الجديدة — سجّل الدخول الآن");
      setMode("login");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setResetCode("");
    } catch (err: any) {
      setError(err.message ?? "تعذر إعادة التعيين");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-14">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(212,175,55,0.12), transparent)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark className="h-16 w-16" />
          <div>
            <h1 className="text-2xl font-black text-cream">لوحة تحكم ViP Yemen</h1>
            <p className="mt-1 text-xs font-semibold text-ink-300">
              منطقة آمنة لإدارة المنصة — للمسؤولين فقط
            </p>
          </div>
        </div>

        <Card className="p-6 sm:p-8">
          {mode === "change" ? (
            <>
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  يجب تغيير كلمة المرور الافتراضية عند أول دخول لأمان حسابك.
                  ستُستخدم بياناتك لتأكيد الهوية.
                </p>
              </div>
              <form onSubmit={handleChange} className="space-y-4">
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input value={email} disabled dir="ltr" className="text-left opacity-60" />
                </div>
                <div>
                  <Label>كلمة المرور الحالية *</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <Label>كلمة المرور الجديدة *</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8 أحرف على الأقل"
                    required
                  />
                </div>
                <div>
                  <Label>تأكيد كلمة المرور الجديدة *</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد كتابة كلمة المرور"
                    required
                  />
                </div>
                {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">{error}</p>}
                <Button type="submit" loading={busy} className="w-full">
                  <ShieldCheck className="h-4 w-4" />
                  حفظ كلمة المرور الجديدة
                </Button>
              </form>
            </>
          ) : mode === "reset" ? (
            <>
              <div className="mb-5">
                <h2 className="text-base font-extrabold text-cream">استعادة كلمة المرور</h2>
                <p className="mt-1 text-xs text-ink-300">
                  أدخل بريد الإدارة وسيصلك رمز مكوّن من 6 أرقام.
                </p>
              </div>
              {!success && !devCode ? (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      dir="ltr"
                      className="text-left"
                      required
                    />
                  </div>
                  {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">{error}</p>}
                  <Button type="submit" loading={busy} className="w-full">
                    <RefreshCw className="h-4 w-4" />
                    إرسال رمز الاستعادة
                  </Button>
                </form>
              ) : (
                <>
                  {success && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      {success}
                    </div>
                  )}
                  {devCode && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                      <p className="text-[11px] font-bold text-amber-200">رمز الطوارئ (بيئة تجريبية)</p>
                      <p dir="ltr" className="mt-1 text-2xl font-black tracking-[0.4em] text-amber-300">{devCode}</p>
                    </div>
                  )}
                  <form onSubmit={handleReset} className="space-y-4">
                    <div>
                      <Label>رمز الاستعادة *</Label>
                      <Input
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        dir="ltr"
                        className="text-left tracking-widest"
                        placeholder="6 أرقام"
                        required
                      />
                    </div>
                    <div>
                      <Label>كلمة المرور الجديدة *</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="8 أحرف على الأقل"
                        required
                      />
                    </div>
                    <div>
                      <Label>تأكيد كلمة المرور *</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="أعد كتابة كلمة المرور"
                        required
                      />
                    </div>
                    {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">{error}</p>}
                    <Button type="submit" loading={busy} className="w-full">
                      <KeyRound className="h-4 w-4" />
                      تعيين كلمة المرور
                    </Button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-base font-extrabold text-cream">تسجيل الدخول</h2>
                <p className="mt-1 text-xs text-ink-300">بريد الإدارة وكلمة المرور</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                    className="text-left"
                    required
                  />
                </div>
                <div>
                  <Label>كلمة المرور</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">{error}</p>}
                <Button type="submit" loading={busy} className="w-full">
                  <LogIn className="h-4 w-4" />
                  دخول لوحة التحكم
                </Button>
              </form>
              <button
                onClick={() => setMode("reset")}
                className="mx-auto mt-4 flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300"
              >
                <Lock className="h-3.5 w-3.5" />
                نسيت كلمة المرور؟
              </button>
            </>
          )}
        </Card>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-ink-400">
          <Mail className="h-3.5 w-3.5" />
          vipservicesyemen@gmail.com — للدعم الفني
        </p>
      </motion.div>
    </div>
  );
}