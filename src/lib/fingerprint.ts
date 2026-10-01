/**
 * 🧬 البصمة الإلكترونية (WebAuthn / Platform Authenticator) — ViP Yemen
 *
 * تُنشئ بيانات اعتماد موقّعة على جهاز المستفيد (بصمة الوجه/الإصصر/رمز
 * الجهاز) وتُخزَّن كإثبات في وثيقة التوثيق الإلكتروني. إن تعذّر الماسح
 * (جهاز قديم/متصفح غير مدعوم) يُسجَّل مسار بديل واضح في البصمة نفسها.
 */

export type FingerprintResult = {
  mode: "webauthn" | "fallback";
  credentialId?: string;
  verified: boolean;
};

export function webAuthnAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential === "function" &&
    !!window.navigator?.credentials?.create
  );
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** مسار بديل مسجَّل: تأكيد إلكتروني عند تعذّر ماسح البصمة. */
export function fallbackFingerprint(): FingerprintResult {
  return { mode: "fallback", verified: true };
}

/** يُنشئ بصمة إلكترونية حقيقية عبر WebAuthn — يرمي خطأ إن رفض المستخدم. */
export async function createFingerprint(): Promise<FingerprintResult> {
  if (!webAuthnAvailable()) return fallbackFingerprint();
  try {
    const credential = await window.navigator.credentials.create({
      publicKey: {
        rp: { name: "ViP Yemen" },
        user: {
          id: crypto.getRandomValues(new Uint8Array(32)),
          name: `vip-${Date.now()}`,
          displayName: "مستفيد ViP Yemen",
        },
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        attestation: "none",
      },
    });
    if (!credential) return fallbackFingerprint();
    return {
      mode: "webauthn",
      credentialId: bufferToBase64url((credential as PublicKeyCredential).rawId),
      verified: true,
    };
  } catch {
    // المستخدم رفض أو الماسح غير متاح — يقرّر الاستدعاء بالمسار البديل.
    throw new FingerprintUnavailable();
  }
}

export class FingerprintUnavailable extends Error {
  constructor() {
    super("تعذّر استخدام ماسح البصمة على هذا الجهاز");
  }
}
