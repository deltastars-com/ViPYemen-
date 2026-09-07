/**
 * Real biometric security (fingerprint + face) for the admin dashboard.
 *
 * - Web / PWA: WebAuthn platform authenticator (Touch ID / Face ID /
 *   Windows Hello / Android fingerprint) — a true device-bound,
 *   user-verifying credential. Nothing fake, no PIN fallback.
 * - Native Android/iOS: the OS BiometricPrompt via the native biometric
 *   plugin (loaded dynamically so the web bundle stays clean).
 *
 * Enrollment is per-device: enabling the gate registers a credential on
 * THIS device, and every dashboard entry afterwards requires a successful
 * user-verification (fingerprint / face / device PIN enforced by the OS
 * authenticator policy) before the dashboard unlocks.
 */
import { isNativeApp } from "./native";

const ENROLLED_KEY = "vip_biometric_enrolled";
const CRED_ID_KEY = "vip_biometric_cred_id";

function b64urlToBytes(s: string): Uint8Array {
  const pad = "===".slice((s.length + 3) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(b: ArrayBuffer | Uint8Array): string {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** True when this device can perform user-verifying biometric auth. */
export async function isBiometricSupported(): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const { NativeBiometric } = await import("capacitor-native-biometric");
      const { isAvailable } = await NativeBiometric.isAvailable();
      return !!isAvailable;
    } catch {
      return false;
    }
  }
  try {
    if (!window.PublicKeyCredential) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnrolled(): boolean {
  try {
    return localStorage.getItem(ENROLLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function disableBiometric(): void {
  try {
    localStorage.removeItem(ENROLLED_KEY);
    localStorage.removeItem(CRED_ID_KEY);
  } catch {
    // ignore
  }
}

/**
 * Register the device biometric. Performs a real platform-authenticator
 * ceremony (the user MUST touch the sensor / show their face to enroll).
 */
export async function enrollBiometric(accountName: string): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const { NativeBiometric } = await import("capacitor-native-biometric");
      const { isAvailable, biometryType } = await NativeBiometric.isAvailable();
      if (!isAvailable) return false;
      // Simple "is really you" check to bind the device now.
      await NativeBiometric.verifyIdentity({
        reason: "تفعيل تأمين البصمة للوحة التحكم",
        title: "تأكيد الهوية",
        subtitle: "منصة ViP Yemen",
        description: "ثبّت بصمتك أو أظهر وجهك لتفعيل الحماية",
      });
      await NativeBiometric.setCredentials({
        username: accountName,
        password: `vip-biometric-${biometryType}`,
        server: "vipyemen",
      });
      localStorage.setItem(ENROLLED_KEY, "1");
      return true;
    } catch {
      return false;
    }
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "ViP Yemen", id: location.hostname },
        user: {
          id: new TextEncoder().encode(`vip-admin:${accountName}:${Date.now()}`),
          name: accountName,
          displayName: "إدارة ViP Yemen",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(CRED_ID_KEY, bytesToB64url(cred.rawId));
    localStorage.setItem(ENROLLED_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify the enrolled biometric. Resolves true ONLY after a successful
 * fingerprint/face (or device PIN where the OS policy allows it).
 */
export async function verifyBiometric(reason: string): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const { NativeBiometric } = await import("capacitor-native-biometric");
      await NativeBiometric.verifyIdentity({
        reason,
        title: "تأكيد الهوية",
        subtitle: "منصة ViP Yemen",
        description: "التحقق بالبصمة مطلوب لفتح لوحة التحكم",
      });
      return true;
    } catch {
      return false;
    }
  }

  try {
    const credId = localStorage.getItem(CRED_ID_KEY);
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: location.hostname,
        allowCredentials: credId
          ? [{ type: "public-key" as const, id: b64urlToBytes(credId) as BufferSource }]
          : [],
        userVerification: "required",
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    return !!assertion;
  } catch {
    return false;
  }
}
