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
  "action.cancel": { ar: "إلغاء", en: "Cancel" },
  "action.back": { ar: "رجوع", en: "Back" },

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
  "onboarding.form.cr": { ar: "رقم السجل التجاري (اختياري)", en: "Commercial Registration (Optional)" },
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
  "type.producer.desc": { ar: "لديّ نفايات أرغب ببيعها أو التخلص منها", en: "I have waste I want to sell or dispose of" },
  "type.buyer.desc": { ar: "أبحث عن مواد قابلة للتدوير لشرائها", en: "I'm looking for recyclable materials to purchase" },
  "type.carrier.desc": { ar: "أقدم خدمات نقل النفايات والمواد", en: "I provide waste and material transport services" },

  "dashboard.welcome": { ar: "أهلاً بك،", en: "Welcome," },
  "dashboard.role.producer": { ar: "منتج", en: "Producer" },
  "dashboard.role.buyer": { ar: "مشتري", en: "Buyer" },
  "dashboard.role.carrier": { ar: "ناقل", en: "Carrier" },
  "dashboard.comingsoon": { ar: "قريباً", en: "Coming Soon" },

  // M2 — listings shared
  "material.paper": { ar: "ورق وكرتون", en: "Paper & Cardboard" },
  "material.plastic": { ar: "بلاستيك", en: "Plastic" },
  "material.metal": { ar: "معادن", en: "Metals" },
  "material.glass": { ar: "زجاج", en: "Glass" },
  "material.electronics": { ar: "إلكترونيات", en: "Electronics" },
  "material.organic": { ar: "نفايات عضوية", en: "Organic" },
  "material.other": { ar: "أخرى", en: "Other" },

  "unit.kg": { ar: "كجم", en: "kg" },
  "unit.ton": { ar: "طن", en: "ton" },

  "status.open": { ar: "مفتوح", en: "Open" },
  "status.closed": { ar: "مغلق", en: "Closed" },

  // Producer — new listing
  "listing.new.title": { ar: "إضافة عرض نفايات", en: "Add Waste Listing" },
  "listing.new.subtitle": {
    ar: "اعرض نفاياتك ليطّلع عليها المشترون",
    en: "Make your waste available for buyers to discover",
  },
  "listing.form.material": { ar: "نوع المادة", en: "Material" },
  "listing.form.quantity": { ar: "الكمية", en: "Quantity" },
  "listing.form.unit": { ar: "الوحدة", en: "Unit" },
  "listing.form.city": { ar: "المدينة", en: "City" },
  "listing.form.description": { ar: "وصف مختصر (اختياري)", en: "Short Description (Optional)" },
  "listing.form.priceHint": { ar: "السعر الإرشادي (ريال) — اختياري", en: "Price Hint (SAR) — Optional" },
  "listing.form.submit": { ar: "نشر العرض", en: "Publish Listing" },
  "listing.form.saving": { ar: "جاري النشر...", en: "Publishing..." },
  "listing.form.error": { ar: "تعذر نشر العرض. تأكد من البيانات وحاول مرة أخرى.", en: "Could not publish the listing. Check your inputs and try again." },

  // Producer — my listings
  "myListings.title": { ar: "عروضي", en: "My Listings" },
  "myListings.subtitle": { ar: "كل عروض النفايات التي نشرتها", en: "All the waste listings you've published" },
  "myListings.empty.title": { ar: "لا توجد عروض حالياً", en: "No listings yet" },
  "myListings.empty.desc": { ar: "ابدأ بإضافة أول عرض نفايات لك.", en: "Start by adding your first waste listing." },
  "myListings.add": { ar: "إضافة عرض", en: "Add Listing" },
  "myListings.close": { ar: "إغلاق العرض", en: "Close Listing" },
  "myListings.closing": { ar: "جاري الإغلاق...", en: "Closing..." },
  "myListings.closeError": { ar: "تعذر إغلاق العرض. حاول مرة أخرى.", en: "Could not close the listing. Try again." },

  // Buyer — marketplace
  "marketplace.title": { ar: "السوق", en: "Marketplace" },
  "marketplace.subtitle": { ar: "تصفح عروض النفايات المتاحة من المنتجين", en: "Browse available waste listings from producers" },
  "marketplace.filter.material": { ar: "فلترة بالمادة", en: "Filter by material" },
  "marketplace.filter.city": { ar: "ابحث بالمدينة", en: "Search by city" },
  "marketplace.filter.all": { ar: "جميع المواد", en: "All materials" },
  "marketplace.empty.title": { ar: "لا توجد عروض حالياً", en: "No listings available" },
  "marketplace.empty.desc": { ar: "جرّب تعديل الفلاتر، أو عُد لاحقاً عند توفّر عروض جديدة.", en: "Try adjusting your filters, or check back later for new listings." },

  // Listing card / detail
  "listing.quantity": { ar: "الكمية", en: "Quantity" },
  "listing.city": { ar: "المدينة", en: "City" },
  "listing.priceHint": { ar: "السعر الإرشادي", en: "Price Hint" },
  "listing.publishedBy": { ar: "نشرها", en: "Published by" },
  "listing.publishedOn": { ar: "تاريخ النشر", en: "Published" },
  "listing.sar": { ar: "ر.س", en: "SAR" },

  // Generic errors
  "error.generic": { ar: "حدث خطأ. حاول مرة أخرى لاحقاً.", en: "Something went wrong. Please try again later." },
  "error.loading": { ar: "تعذر تحميل البيانات.", en: "Could not load data." },

  // M3 — listing detail
  "listing.viewDetail": { ar: "عرض التفاصيل", en: "View Details" },
  "listing.ref": { ar: "رقم الإشارة", en: "Reference" },
  "listing.detail.title": { ar: "تفاصيل العرض", en: "Listing Details" },
  "listing.detail.subtitle": { ar: "كل تفاصيل العرض المنشور", en: "Full details of this listing" },
  "listing.detail.publishedBy": { ar: "نشرها", en: "Published by" },
  "listing.detail.description": { ar: "الوصف", en: "Description" },

  "listing.close.confirm.title": { ar: "تأكيد إغلاق العرض", en: "Confirm Closing" },
  "listing.close.confirm.desc": {
    ar: "هذا الإجراء نهائي ولا يمكن التراجع عنه. لن يظهر العرض في السوق بعد الإغلاق.",
    en: "This action is permanent and cannot be undone. The listing will no longer appear in the marketplace.",
  },
  "listing.close.confirm.action": { ar: "إغلاق العرض نهائياً", en: "Close Listing Permanently" },

  "listing.offer.cta": { ar: "تقديم عرض سعر", en: "Submit a Price Offer" },
  "listing.offer.hint": {
    ar: "قريباً ستتمكن من المنافسة مع مشترين آخرين وإرسال أفضل سعر مباشرةً إلى المنتج.",
    en: "Soon you'll be able to compete with other buyers and send your best price directly to the producer.",
  },

  "listing.notFound.title": { ar: "العرض غير موجود", en: "Listing Not Found" },
  "listing.notFound.desc": {
    ar: "قد يكون العرض محذوفاً أو المعرّف غير صحيح.",
    en: "The listing may have been removed or the ID is invalid.",
  },
  "listing.invalidId.title": { ar: "معرّف العرض غير صالح", en: "Invalid Listing ID" },
  "listing.invalidId.desc": {
    ar: "الرابط الذي فتحته لا يحتوي على معرّف عرض صالح.",
    en: "The link you followed does not contain a valid listing ID.",
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
