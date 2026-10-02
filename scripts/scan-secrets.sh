#!/usr/bin/env sh
# 🔐 حاجز الأسرار — يمنع تكرار تسريب التوكنات في المستودع.
#
# يفحص الملفات المتعقَّبة في git بحثاً عن أنماط أسرار معروفة (توكن بوت تلجرام ·
# توكن فيسبوك · مفاتيح مزوّدي الخدمات · مفاتيح خاصة). أي سطر يحمل الوسم
# `legacy-leaked-secret-allowlisted` يُتجاوز، لأنه سرّ قديم معروف ومنتظر الإزالة.
#
# يُشغَّل آلياً من `.github/workflows/secret-scan.yml` عند كل دفع وطلب دمج،
# ويمكن تشغيله يدوياً:  sh scripts/scan-secrets.sh
set -eu

PATTERNS='[0-9]{8,10}:AA[A-Za-z0-9_-]{30,}|EAAG[A-Za-z0-9]{20,}|sk_live_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{30,}'

# لا نفحص الحاجز نفسه (يحتوي أنماط الفحص لا أسراراً).
FILES=$(git ls-files | grep -v -e '^scripts/scan-secrets\.sh$' -e '^\.github/workflows/secret-scan\.yml$' || true)

FAIL=0
if [ -n "$FILES" ]; then
  HITS=$(printf '%s\n' "$FILES" | xargs -r grep -n -I -E "$PATTERNS" 2>/dev/null | grep -v 'legacy-leaked-secret-allowlisted' || true)
  if [ -n "$HITS" ]; then
    echo "🔐 حاجز الأسرار: وُجدت أسرار مكتوبة صريحةً في ملفات المستودع:"
    printf '%s\n' "$HITS"
    echo ""
    FAIL=1
  fi

  KEYS=$(printf '%s\n' "$FILES" | xargs -r grep -n -I -E 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' 2>/dev/null | grep -v 'legacy-leaked-secret-allowlisted' || true)
  if [ -n "$KEYS" ]; then
    echo "🔐 حاجز الأسرار: وُجدت مفاتيح خاصة مكتوبة صريحةً:"
    printf '%s\n' "$KEYS"
    echo ""
    FAIL=1
  fi
fi

if [ "$FAIL" -eq 1 ]; then
  echo "الحل: أزل القيمة من الملف واستبدلها بشرح، وأضف السرّ في متغيرات Convex"
  echo "      (ويُفضّل تبديل السرّ من مصدره لأنه صار مرئياً في تاريخ المستودع)."
  exit 1
fi

echo "✅ حاجز الأسرار: لا أسرار مكتوبة صريحةً في ملفات المستودع."
