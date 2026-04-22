import React, { createContext, useContext, useEffect, useState } from "react";

type Language = "ar" | "en";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const translations: Record<string, Record<Language, string>> = {
  "app.name": { ar: "تدويرة", en: "Tadweerah" },
  "app.tagline": {
    ar: "منصة سعودية تربط منتجي النفايات بشركات التدوير والناقلين",
    en: "A Saudi platform connecting waste producers, recyclers, and carriers",
  },
  "app.description": {
    ar: "أعد تدوير نفاياتك بكفاءة. نوصل منتجي النفايات بشركات التدوير وشركات النقل في مكان واحد.",
    en: "Recycle your waste efficiently. We connect waste producers with recycling buyers and transport carriers — all in one place.",
  },
  "nav.language": { ar: "English", en: "العربية" },
  "action.signin": { ar: "تسجيل الدخول", en: "Sign In" },
  "action.signup": { ar: "إنشاء حساب", en: "Sign Up" },
  "action.signout": { ar: "تسجيل الخروج", en: "Sign Out" },
  "action.getstarted": { ar: "ابدأ الآن", en: "Get Started" },
  "action.learnmore": { ar: "اعرف المزيد", en: "Learn More" },

  "home.feature1.title": { ar: "للمنتجين", en: "For Producers" },
  "home.feature1.desc": {
    ar: "اعرض نفاياتك واستلم عروضًا من شركات التدوير",
    en: "List your waste and receive offers from recycling buyers",
  },
  "home.feature2.title": { ar: "للمشترين", en: "For Buyers" },
  "home.feature2.desc": {
    ar: "تصفح آلاف الفرص لشراء مواد قابلة للتدوير",
    en: "Browse thousands of opportunities to buy recyclable materials",
  },
  "home.feature3.title": { ar: "للناقلين", en: "For Carriers" },
  "home.feature3.desc": {
    ar: "قدم عروض نقل واكسب رحلات جديدة بسهولة",
    en: "Submit transport bids and win new trips easily",
  },

  "onboarding.title": { ar: "أنشئ ملف شركتك", en: "Create your company profile" },
  "onboarding.subtitle": {
    ar: "أكمل بياناتك للبدء باستخدام تدويرة",
    en: "Complete your details to start using Tadweerah",
  },
  "onboarding.form.name": { ar: "اسم الشركة", en: "Company Name" },
  "onboarding.form.type": { ar: "نوع الشركة", en: "Company Type" },
  "onboarding.form.city": { ar: "المدينة", en: "City" },
  "onboarding.form.cr": {
    ar: "رقم السجل التجاري (اختياري)",
    en: "Commercial Registration (Optional)",
  },
  "onboarding.form.phone": { ar: "رقم التواصل", en: "Contact Phone" },
  "onboarding.form.submit": { ar: "حفظ ومتابعة", en: "Save & Continue" },
  "onboarding.form.saving": { ar: "جاري الحفظ...", en: "Saving..." },
  "onboarding.error.generic": {
    ar: "حدث خطأ أثناء الحفظ. حاول مرة أخرى.",
    en: "Something went wrong. Please try again.",
  },

  "type.producer": { ar: "منتج نفايات", en: "Waste Producer" },
  "type.buyer": { ar: "شركة تدوير", en: "Recycling Buyer" },
  "type.carrier": { ar: "ناقل", en: "Carrier" },
  "type.producer.desc": {
    ar: "لديّ نفايات أرغب ببيعها أو التخلص منها",
    en: "I have waste I want to sell or dispose of",
  },
  "type.buyer.desc": {
    ar: "أبحث عن مواد قابلة للتدوير لشرائها",
    en: "I'm looking for recyclable materials to purchase",
  },
  "type.carrier.desc": {
    ar: "أقدم خدمات نقل النفايات والمواد",
    en: "I provide waste and material transport services",
  },

  "dashboard.welcome": { ar: "أهلاً بك،", en: "Welcome," },
  "dashboard.role.producer": { ar: "منتج", en: "Producer" },
  "dashboard.role.buyer": { ar: "مشتري", en: "Buyer" },
  "dashboard.role.carrier": { ar: "ناقل", en: "Carrier" },
  "dashboard.comingsoon": { ar: "قريباً", en: "Coming Soon" },

  "card.producer.1.title": { ar: "إضافة عرض نفايات", en: "Add Waste Listing" },
  "card.producer.1.desc": {
    ar: "اعرض نفاياتك للبيع — متاح في المرحلة القادمة",
    en: "List your waste for sale — available in the next phase",
  },
  "card.producer.2.title": { ar: "عروضي الحالية", en: "My Listings" },
  "card.producer.2.desc": {
    ar: "تابع جميع عروضك ومستجداتها",
    en: "Track all your listings and their status",
  },
  "card.producer.3.title": { ar: "الطلبات الواردة", en: "Incoming Offers" },
  "card.producer.3.desc": {
    ar: "راجع طلبات الشراء من شركات التدوير",
    en: "Review purchase requests from recycling companies",
  },

  "card.buyer.1.title": { ar: "تصفح السوق", en: "Browse Marketplace" },
  "card.buyer.1.desc": {
    ar: "اكتشف نفايات قابلة للتدوير من المنتجين",
    en: "Discover recyclable waste from producers",
  },
  "card.buyer.2.title": { ar: "اهتماماتي", en: "My Interests" },
  "card.buyer.2.desc": {
    ar: "تابع كل العروض التي قدّمت اهتمامك بها",
    en: "Track all listings you've expressed interest in",
  },
  "card.buyer.3.title": { ar: "الصفقات النشطة", en: "Active Deals" },
  "card.buyer.3.desc": {
    ar: "تابع الصفقات الجارية حتى الإغلاق",
    en: "Follow ongoing deals until completion",
  },

  "card.carrier.1.title": { ar: "طلبات النقل المتاحة", en: "Available Transport Bids" },
  "card.carrier.1.desc": {
    ar: "تصفح فرص النقل وقدم عروضك",
    en: "Browse transport opportunities and submit bids",
  },
  "card.carrier.2.title": { ar: "عروضي المقدّمة", en: "My Bids" },
  "card.carrier.2.desc": {
    ar: "تابع كل عروض النقل التي قدمتها",
    en: "Track all the bids you've submitted",
  },
  "card.carrier.3.title": { ar: "الرحلات النشطة", en: "Active Trips" },
  "card.carrier.3.desc": {
    ar: "تابع الرحلات قيد التنفيذ",
    en: "Monitor trips currently in progress",
  },
};

export const I18nProvider: React.FC<{
  children: React.ReactNode;
  defaultLang?: Language;
}> = ({ children, defaultLang = "ar" }) => {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") return defaultLang;
    const saved = window.localStorage.getItem("tadweerah_lang");
    return (saved as Language) || defaultLang;
  });

  useEffect(() => {
    window.localStorage.setItem("tadweerah_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (newLang: Language) => setLangState(newLang);

  const t = (key: string): string => translations[key]?.[lang] ?? key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useT = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useT must be used within an I18nProvider");
  }
  return ctx;
};
