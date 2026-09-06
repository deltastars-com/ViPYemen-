import {
  Briefcase,
  Building2,
  Home,
  ShoppingBag,
  UserRound,
  Store,
  Search,
  Code2,
  Landmark,
  Car,
  Laptop,
  Package,
  Hammer,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type FieldType = "text" | "textarea" | "number" | "select";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface SubmissionTypeConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  fields: FieldDef[];
  showPhoneOnCard: boolean;
}

export interface CategoryConfig {
  key: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  accent: string;
  hero: string;
  description: string;
  types: SubmissionTypeConfig[];
}

export const CATEGORIES: CategoryConfig[] = [
  {
    key: "jobs",
    label: "التوظيف",
    shortLabel: "توظيف",
    icon: Briefcase,
    accent: "sky",
    hero: "فرص عمل موثوقة وكوادر مؤهلة",
    description:
      "سجّل بياناتك كباحث عن عمل أو أعلن عن وظيفة في منشأتك — تُراجع الطلبات من إدارة المنصة قبل النشر لضمان الحقوق والجودة.",
    types: [
      {
        value: "seeker",
        label: "أبحث عن عمل",
        icon: UserRound,
        titleLabel: "المسمى الوظيفي المطلوب",
        titlePlaceholder: "مثال: مهندس مدني / محاسب / مصمم جرافيك",
        descriptionLabel: "ملخص عنك وخبراتك",
        descriptionPlaceholder: "اكتب نبذة عن خبراتك ومهاراتك وسبب بحثك عن هذه الوظيفة",
        showPhoneOnCard: false,
        fields: [
          {
            name: "profession",
            label: "المهنة / التخصص",
            type: "select",
            required: true,
            options: [
              "مهندس",
              "محاسب",
              "معلم",
              "ممرض / طبيب",
              "مبرمج / مطور",
              "مصمم جرافيك / مونتاج",
              "مسوق إلكتروني",
              "سكرتير / إداري",
              "عامل",
              "سائق",
              "أخرى",
            ],
          },
          {
            name: "experience",
            label: "سنوات الخبرة",
            type: "text",
            placeholder: "مثال: 3 سنوات",
          },
          {
            name: "qualifications",
            label: "المؤهلات والشهادات",
            type: "textarea",
            placeholder: "اذكر مؤهلاتك العلمية والشهادات والدورات (يُرفق إثباتها في المرفقات)",
          },
          {
            name: "expectedSalary",
            label: "الراتب المتوقع (اختياري)",
            type: "text",
            placeholder: "مثال: 150,000 ريال",
          },
        ],
      },
      {
        value: "employer",
        label: "أنا صاحب منشأة / أعلن عن وظيفة",
        icon: Building2,
        titleLabel: "المسمى الوظيفي المطلوب",
        titlePlaceholder: "مثال: مدير مبيعات",
        descriptionLabel: "وصف الوظيفة والمهام",
        descriptionPlaceholder: "اكتب وصف المهام والمسؤوليات للوظيفة",
        showPhoneOnCard: false,
        fields: [
          {
            name: "company",
            label: "اسم المنشأة / الشركة",
            type: "text",
            required: true,
            placeholder: "اسم المنشأة",
          },
          {
            name: "profession",
            label: "المهنة المطلوبة",
            type: "select",
            required: true,
            options: [
              "مهندس",
              "محاسب",
              "معلم",
              "ممرض / طبيب",
              "مبرمج / مطور",
              "مصمم جرافيك / مونتاج",
              "مسوق إلكتروني",
              "سكرتير / إداري",
              "عامل",
              "سائق",
              "أخرى",
            ],
          },
          {
            name: "workType",
            label: "نوع العمل",
            type: "select",
            options: ["دوام كامل", "دوام جزئي", "عن بُعد", "مؤقت / موسمي"],
          },
          {
            name: "requirements",
            label: "الشروط والمتطلبات",
            type: "textarea",
            required: true,
            placeholder: "اذكر شروط التقديم: المؤهلات، الخبرة، المهارات المطلوبة",
          },
          {
            name: "salary",
            label: "الراتب (اختياري)",
            type: "text",
            placeholder: "مثال: 200,000 ريال",
          },
        ],
      },
    ],
  },
  {
    key: "real_estate",
    label: "التسويق العقاري",
    shortLabel: "عقارات",
    icon: Home,
    accent: "emerald",
    hero: "عقارات موثوقة وبائعون ومشترون حقيقيون",
    description:
      "اعرض أرضك أو منزلك أو عمارتك أو فيلتك، أو سجّل طلبك كباحث عن عقار — كل الطلبات تمر بمراجعة إدارة المنصة قبل النشر.",
    types: [
      {
        value: "owner",
        label: "أنا مالك عقار — أريد البيع / التأجير",
        icon: Landmark,
        titleLabel: "عنوان العقار",
        titlePlaceholder: "مثال: أرض في حدة — مساحة 200 متر",
        descriptionLabel: "تفاصيل العقار",
        descriptionPlaceholder: "موقع العقار، الواجهة، الخدمات القريبة، سبب البيع، أي تفاصيل مهمة",
        showPhoneOnCard: true,
        fields: [
          {
            name: "propertyType",
            label: "نوع العقار",
            type: "select",
            required: true,
            options: ["أرض", "منزل", "عمارة", "فيلا", "شقة", "محل تجاري", "مزرعة", "أخرى"],
          },
          {
            name: "area",
            label: "المساحة (متر مربع)",
            type: "text",
            placeholder: "مثال: 250",
          },
          {
            name: "district",
            label: "الحي / المديرية",
            type: "text",
            required: true,
            placeholder: "مثال: حي شميلة — صنعاء",
          },
          {
            name: "purpose",
            label: "الغرض",
            type: "select",
            options: ["بيع", "إيجار", "بيع أو إيجار"],
          },
          {
            name: "documents",
            label: "الأوراق والمستندات المتوفرة",
            type: "textarea",
            placeholder: "مثال: صك ملكية، عقد مسجل، فاتورة كهرباء — مع رفع صورها في المرفقات",
          },
        ],
      },
      {
        value: "buyer",
        label: "أبحث عن عقار",
        icon: Search,
        titleLabel: "نوع العقار المطلوب",
        titlePlaceholder: "مثال: فيلا في حدة بمساحة 300 متر",
        descriptionLabel: "طلبك بالتفصيل",
        descriptionPlaceholder: "اكتب تفاصيل طلبك: الموقع المفضل، المساحة، المواصفات، الميزانية",
        showPhoneOnCard: false,
        fields: [
          {
            name: "propertyType",
            label: "نوع العقار المطلوب",
            type: "select",
            required: true,
            options: ["أرض", "منزل", "عمارة", "فيلا", "شقة", "محل تجاري", "مزرعة", "أخرى"],
          },
          {
            name: "district",
            label: "الحي / المديرية المفضلة",
            type: "text",
            required: true,
            placeholder: "مثال: حدة أو الحصبة — صنعاء",
          },
          {
            name: "purpose",
            label: "الغرض",
            type: "select",
            options: ["شراء", "إيجار", "شراء أو إيجار"],
          },
        ],
      },
    ],
  },
  {
    key: "emarket",
    label: "التسويق الإلكتروني",
    shortLabel: "تسويق إلكتروني",
    icon: ShoppingBag,
    accent: "amber",
    hero: "اعرض منتجك أو ابحث عن طلبك — مع تحقق من رقم الهاتف",
    description:
      "سوق إلكتروني شامل: أجهزة، سيارات، آلات، سلع متنوعة. يتحقق النظام من رقم هاتفك ويربطك مباشرة بواتساب المنصة.",
    types: [
      {
        value: "seller",
        label: "أعرض منتجاً للبيع",
        icon: Store,
        titleLabel: "اسم المنتج / السلعة",
        titlePlaceholder: "مثال: جوال آيفون 13 — 128GB",
        descriptionLabel: "المواصفات والتفاصيل",
        descriptionPlaceholder: "الحالة، المواصفات، الملحقات، سبب البيع، إمكانية التفاوض",
        showPhoneOnCard: true,
        fields: [
          {
            name: "productType",
            label: "نوع المنتج",
            type: "select",
            required: true,
            options: ["جهاز إلكتروني", "جوال / تابلت", "حاسوب / لابتوب", "سيارة", "آلة / معدات", "سلعة", "أخرى"],
          },
          {
            name: "brand",
            label: "الماركة / الموديل",
            type: "text",
            placeholder: "مثال: سامسونج Galaxy S23",
          },
          {
            name: "condition",
            label: "الحالة",
            type: "select",
            options: ["جديد", "مستعمل — بحالة ممتازة", "مستعمل — جيد", "مستعمل — مقبول"],
          },
        ],
      },
      {
        value: "buyer",
        label: "أبحث عن منتج / سلعة",
        icon: Search,
        titleLabel: "المنتج / السلعة المطلوبة",
        titlePlaceholder: "مثال: لابتوب للمونتاج بميزانية 400,000",
        descriptionLabel: "طلبك بالتفصيل",
        descriptionPlaceholder: "المواصفات المطلوبة، الميزانية، مكان التسليم",
        showPhoneOnCard: false,
        fields: [
          {
            name: "productType",
            label: "نوع المنتج المطلوب",
            type: "select",
            required: true,
            options: ["جهاز إلكتروني", "جوال / تابلت", "حاسوب / لابتوب", "سيارة", "آلة / معدات", "سلعة", "أخرى"],
          },
          {
            name: "brand",
            label: "الماركة / الموديل المفضل",
            type: "text",
            placeholder: "اختياري",
          },
        ],
      },
    ],
  },
  {
    key: "software",
    label: "البرمجيات وتطوير التطبيقات",
    shortLabel: "برمجيات",
    icon: Code2,
    accent: "violet",
    hero: "مواقع وتطبيقات وأنظمة برمجية بمعايير عالمية",
    description:
      "اطلب مشروعك البرمجي: مواقع ويب، تطبيقات جوال Android وiOS، لوحات تحكم، أنظمة متكاملة — تُراجع طلباتك من الإدارة وتُتواصل معك مباشرة.",
    types: [
      {
        value: "client",
        label: "أطلب خدمة برمجية",
        icon: Code2,
        titleLabel: "نوع المشروع",
        titlePlaceholder: "مثال: متجر إلكتروني متكامل",
        descriptionLabel: "وصف المشروع والمتطلبات",
        descriptionPlaceholder: "اشرح فكرة المشروع بالتفصيل: الأقسام، المستخدمون، الميزات المطلوبة، الفترة الزمنية",
        showPhoneOnCard: false,
        fields: [
          {
            name: "projectType",
            label: "نوع الخدمة",
            type: "select",
            required: true,
            options: [
              "موقع ويب",
              "تطبيق أندرويد",
              "تطبيق iOS",
              "تطبيق Android + iOS",
              "لوحة تحكم",
              "نظام متكامل",
              "تصميم واجهات UI/UX",
              "تسويق إلكتروني و SEO",
              "صيانة وتطوير",
              "أخرى",
            ],
          },
          {
            name: "budget",
            label: "الميزانية التقديرية (اختياري)",
            type: "text",
            placeholder: "مثال: 500,000 ريال",
          },
          {
            name: "deadline",
            label: "الفترة الزمنية المتوقعة",
            type: "text",
            placeholder: "مثال: شهران",
          },
          {
            name: "references",
            label: "مراجع / نماذج مشابهة (اختياري)",
            type: "textarea",
            placeholder: "روابط لمواقع أو تطبيقات مشابهة تفضلها",
          },
        ],
      },
    ],
  },
];

export function getCategory(key: string): CategoryConfig {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
}

export function getType(category: CategoryConfig, typeValue: string): SubmissionTypeConfig {
  return (
    category.types.find((t) => t.value === typeValue) ??
    category.types[0]
  );
}

export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "قيد الانتظار", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  published: { label: "منشور", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  rejected: { label: "مرفوض", className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  sold: { label: "تم البيع", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  archived: { label: "مؤرشف", className: "bg-ink-500/15 text-ink-300 border-ink-500/30" },
};

export const TYPE_ICONS: Record<string, LucideIcon> = {
  seeker: UserRound,
  employer: Building2,
  owner: Landmark,
  buyer: Search,
  seller: Store,
  client: Code2,
};

export const PRODUCT_ICONS: Record<string, LucideIcon> = {
  "جهاز إلكتروني": Laptop,
  "جوال / تابلت": Package,
  "حاسوب / لابتوب": Laptop,
  سيارة: Car,
  "آلة / معدات": Hammer,
  سلعة: Package,
  أخرى: Package,
};

export { ShieldCheck };