/**
 * EdgeOne Edge Functions — ViP Yemen
 * Handles SPA routing, security headers, and static caching.
 * Deploy via EdgeOne Pages (similar to Vercel/Netlify).
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Security headers
    const securityHeaders = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    };

    // Try to serve static asset first
    // ملاحظة: google48285d98c7bd5f52.html يُخدم مباشرة كملف HTML حقيقي موجود في dist/
    // دون الحاجة إلى اي JavaScript، لذا لن يُعامل كـ asset تقليدي لكنه سيُعاد كـ 200 OK
    const assetResponse = await fetch(request);
    if (assetResponse.status === 200) {
      const headers = new Headers(assetResponse.headers);
      Object.entries(securityHeaders).forEach(([k, v]) => headers.set(k, v));

      // Immutable cache for hashed assets
      if (pathname.startsWith("/assets/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      } else if (pathname.startsWith("/icons/")) {
        headers.set("Cache-Control", "public, max-age=604800");
      }

      return new Response(assetResponse.body, {
        status: assetResponse.status,
        headers,
      });
    }

    // SPA fallback: serve index.html for all non-asset routes
    const htmlResponse = await fetch(new URL("/index.html", request.url));
    const headers = new Headers(htmlResponse.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    Object.entries(securityHeaders).forEach(([k, v]) => headers.set(k, v));

    return new Response(htmlResponse.body, {
      status: 200,
      headers,
    });
  },
};
