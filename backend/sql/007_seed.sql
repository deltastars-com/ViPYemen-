-- ViP Yemen — Seed Data
-- Run AFTER 006_views.sql

-- =============================================================================
-- INITIAL ADS
-- =============================================================================

INSERT INTO public.ads (title, message, status, priority) VALUES
  ('مرحباً بكم في ViP Yemen', 'منصة التوظيف والتسويق العقاري والإلكتروني والخدمات البرمجية في اليمن', 'active', 10),
  ('تواصل معنا', 'للإعلان أو الاستفسار: واتساب 00967711780999', 'active', 8),
  ('عروض حصرية', 'تابع قسم العروض الترويجية — خصومات وخدمات مميزة', 'active', 6),
  ('وظائف شاغرة', 'تحقق من قسم التوظيف للفرص الحالية والوظائف المتوفرة', 'active', 7),
  ('عقارات للبيع', 'أراضي ومنازل وفيلات بأسعار منافسة في جميع المناطق', 'active', 9);

-- =============================================================================
-- INITIAL OFFERS
-- =============================================================================

INSERT INTO public.offers (title, description, original_price, offer_price, discount_percent, is_featured, status) VALUES
  ('باقة التسويق الشامل', 'حملة تسويقية متكاملة لمنشأتك على جميع منصات التواصل الاجتماعي — تصميم إعلانات، نشر دوري، وتقارير أداء.', 200000, 150000, 25, true, 'published'),
  ('تصميم شعار احترافي', 'تصميم هوية بصرية كاملة لعلامتك التجارية: شعار + بطاقات + ألوان وخطوط — بجودة عالمية.', 80000, 50000, 37, false, 'published'),
  ('تطوير موقع متكامل', 'موقع ويب متجاوب مع لوحة تحكم إدارية ونظام إدارة محتوى — يشمل الاستضافة والنطاق للسنة الأولى.', 600000, 450000, 25, true, 'published'),
  ('تطبيق موبايل احترافي', 'تطبيق Android + iOS متكامل مع لوحة تحكم وإشعارات — يصلح لمتجر أو منصة خدمات.', 800000, 600000, 25, false, 'published'),
  ('حملة إعلانية متكاملة', 'حملة إعلانية على Google Ads + Facebook + Instagram لمدة شهر مع تقارير أداء أسبوعية.', 150000, 100000, 33, true, 'published');

-- =============================================================================
-- INITIAL SETTINGS
-- =============================================================================

INSERT INTO public.settings (key, value) VALUES
  ('platform_name', '"ViP Yemen"'),
  ('platform_name_ar', '"منصة ViP Yemen"'),
  ('whatsapp_number', '"00967711780999"'),
  ('email', '"vipservicesyemen@gmail.com"'),
  ('telegram_channel', '"@VIPservices2"'),
  ('facebook_page', '"https://www.facebook.com/ViPservicesYemen/"'),
  ('instagram', '"https://www.instagram.com/vipservicesyemen"'),
  ('twitter', '"https://twitter.com/ViPservicesYeme"'),
  ('youtube', '"https://youtube.com/channel/UCJGfi4S63-Nm2rSXpBqzHtw"'),
  ('tiktok', '"https://www.tiktok.com/@vipservicesyemen1"'),
  ('location', '"اليمن — صنعاء"'),
  ('copyright', '"© 2026 ViP Yemen — المهندس علي درهم الدحان"'),
  ('default_currency', '"YER"'),
  ('auto_publish', 'true'),
  ('require_phone_verification', 'true'),
  ('maintenance_mode', 'false');

-- =============================================================================
-- INITIAL ADMIN USER (password: Ali711780999*$#@)
-- Password hash generated with pgcrypto
-- =============================================================================

INSERT INTO public.users (email, name, password_hash, role, must_change_password) VALUES
  ('vipservicesyemen@gmail.com', 'المهندس علي درهم الدحان', crypt('Ali711780999*$#@', gen_salt('bf')), 'admin', true);

SELECT 'Seed data inserted successfully' as status;