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
    ar: "منصة B2B لعرض المواد القابلة للتدوير والفائضة، وتلقّي العروض الموثّقة، ومتابعة الصفقات حتى الإغلاق.",
    en: "A structured marketplace for companies to list recyclable or surplus materials, receive documented offers, and track deals through to a formal close.",
  },
  "home.badge": {
    ar: "منصة سعودية لربط منتجي النفايات بالشركات المرخصة",
    en: "Saudi platform connecting waste producers with licensed companies",
  },
  "home.headline": {
    ar: "معاً نحو منظومة نفايات صناعية ذكية، محوكمة، ومستدامة",
    en: "Together toward a smart, governed, and sustainable industrial waste ecosystem",
  },
  "home.subheadline": {
    ar: "كل قيمة تستحق أن تعود",
    en: "Every value deserves to be recovered",
  },
  "home.description": {
    ar: "منصة B2B لعرض المواد القابلة للتدوير وتلقي العروض الموثقة حتى الإغلاق",
    en: "A B2B platform to list recyclable materials, receive documented offers, and close deals",
  },
  "home.trust_line": {
    ar: "نبني سوقاً أكثر كفاءة وشفافية لإدارة المواد القابلة للتدوير",
    en: "Building a more efficient and transparent market for recyclable materials",
  },
  "home.solves.title": { ar: "ماذا تحل تدويرة؟", en: "What it solves" },
  "home.solves.1": {
    ar: "لا يوجد مكان منظم لعرض المواد الفائضة — نشر الإعلانات وتلقّي عروض موثّقة بتواريخها",
    en: "No structured place to list surplus or recyclable materials — post a listing and receive timestamped, documented offers",
  },
  "home.solves.2": {
    ar: "العروض تصل شفهياً بلا سجل — كل عرض وسعره وقراره مسجّل في المنصة بشكل واضح",
    en: "Offers arrive informally with no written record — every offer, price, and decision is recorded on the platform",
  },
  "home.solves.3": {
    ar: "لا يوجد توثيق رسمي عند إغلاق الصفقة — تدويرة تُنشئ سجل صفقة قابلاً للطباعة لكلا الطرفين",
    en: "No formal document when a deal closes — Tadweerah generates a printable deal record for both parties",
  },

  "home.why.title": { ar: "لماذا تدويرة؟", en: "Why Tadweerah?" },
  "home.why.p1": {
    ar: "منصة موحدة ومحوكمة لإدارة المواد القابلة للتدوير",
    en: "A unified, governed platform for recyclable materials management",
  },
  "home.why.p2": {
    ar: "كل عملية موثّقة وقابلة للتتبع بالكامل",
    en: "Every operation documented and fully traceable",
  },
  "home.why.p3": {
    ar: "تقارير امتثال جاهزة للجهات التنظيمية",
    en: "Compliance reports ready for regulatory bodies",
  },
  "home.why.p4": {
    ar: "لوحة تحكم واحدة لمتابعة جميع عملياتك",
    en: "One dashboard to track all your operations",
  },
  "home.why.p5": {
    ar: "خصوصية بيانات عالية تحمي عملياتك",
    en: "Enterprise-grade data privacy protecting your business",
  },
  "home.why.p6": {
    ar: "الوصول إلى سوق أوسع بضغطة زر",
    en: "Access to a wider market at the click of a button",
  },

  "home.for.title": { ar: "لمن هذه المنصة؟", en: "Who Is This For?" },
  "home.for.producers.value": {
    ar: "بِع فائضك بأفضل سعر عبر مزاد شفاف",
    en: "Sell your surplus at the best price via transparent auction",
  },
  "home.for.buyers.value": {
    ar: "اطّلع على مواد تدوير موثوقة ووفّر التكلفة",
    en: "Source reliable recyclables and cut procurement costs",
  },
  "home.for.transporters.value": {
    ar: "احصل على فرص شحن مستمرة من عملاء موثّقين",
    en: "Get steady transport opportunities from verified clients",
  },
  "nav.language": { ar: "English", en: "العربية" },
  "action.signin": { ar: "تسجيل الدخول", en: "Sign In" },
  "action.signup": { ar: "إنشاء حساب", en: "Sign Up" },
  "action.signout": { ar: "تسجيل الخروج", en: "Sign Out" },
  "action.getstarted": { ar: "ابدأ الآن", en: "Get Started" },
  "action.register_company": { ar: "سجّل شركتك مجاناً", en: "Register Your Company — Free" },
  "action.cancel": { ar: "إلغاء", en: "Cancel" },
  "action.close": { ar: "إغلاق", en: "Close" },
  "action.back": { ar: "رجوع", en: "Back" },
  "action.next": { ar: "التالي", en: "Next" },
  "action.save": { ar: "حفظ", en: "Save" },

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
  "onboarding.form.city": { ar: "المدينة", en: "City" },
  "onboarding.form.cr": { ar: "رقم السجل التجاري (اختياري)", en: "Commercial Registration (Optional)" },
  "onboarding.form.phone": { ar: "رقم التواصل", en: "Contact Phone" },
  "onboarding.form.category": { ar: "تصنيف الشركة (اختياري)", en: "Company Category (Optional)" },
  "onboarding.form.category.placeholder": { ar: "اختر تصنيفاً", en: "Select a category" },
  "onboarding.form.actions": { ar: "ماذا تعمل شركتك؟", en: "What does your company do?" },
  "onboarding.form.actions.hint": { ar: "اختر كل ما ينطبق (مطلوب واحد على الأقل)", en: "Select all that apply (at least one required)" },
  "onboarding.form.actions.required": { ar: "الرجاء تحديد نشاط واحد على الأقل", en: "Please select at least one activity" },
  "onboarding.form.actions.loading": { ar: "جاري التحميل...", en: "Loading..." },
  "onboarding.form.actions.error": { ar: "تعذّر تحميل الأنشطة", en: "Failed to load activities" },
  "onboarding.form.actions.empty": { ar: "لا توجد أنشطة متاحة", en: "No activities available" },
  "common.retry": { ar: "إعادة المحاولة", en: "Retry" },
  "onboarding.form.actions.other_desc": { ar: "وصف النشاط الآخر", en: "Describe the other activity" },
  "onboarding.form.actions.other_required": { ar: "الرجاء وصف النشاط الآخر", en: "Please describe the other activity" },
  "onboarding.form.actions.other_placeholder": { ar: "صف ما تقوم به شركتك...", en: "Describe what your company does..." },
  "onboarding.form.license_section": { ar: "معلومات الترخيص", en: "License Information" },
  "onboarding.form.license_section.hint": { ar: "إن كان لديك رقم ترخيص نشاط، يمكنك إدخاله هنا. سيتم مراجعته لاحقًا من قِبَل فريقنا.", en: "If you have an activity license number, you may enter it here. It will be reviewed by our team." },
  "onboarding.form.license.required_badge": { ar: "يتطلب ترخيصًا", en: "License required" },
  "onboarding.form.phone.required": { ar: "رقم التواصل مطلوب", en: "Contact phone is required" },
  "onboarding.form.phone.invalid": { ar: "رقم الهاتف غير صحيح، تأكد من الصيغة", en: "Invalid phone number — please check the format" },
  "onboarding.form.submit": { ar: "حفظ ومتابعة", en: "Save & Continue" },
  "onboarding.form.saving": { ar: "جاري الحفظ...", en: "Saving..." },
  "onboarding.error.generic": {
    ar: "حدث خطأ أثناء الحفظ. حاول مرة أخرى.",
    en: "Something went wrong. Please try again.",
  },

  "dashboard.welcome": { ar: "أهلاً بك،", en: "Welcome," },
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
  "unit.gram": { ar: "جرام", en: "g" },
  "unit.liter": { ar: "لتر", en: "L" },
  "unit.cubic_meter": { ar: "م³", en: "m³" },
  "unit.piece": { ar: "قطعة", en: "pc" },
  "unit.box": { ar: "صندوق", en: "box" },
  "unit.barrel": { ar: "برميل", en: "bbl" },
  "unit.other": { ar: "أخرى", en: "other" },

  "status.open": { ar: "مفتوح", en: "Open" },
  "status.closed": { ar: "مغلق", en: "Closed" },

  // Producer — new listing
  "listing.new.title": { ar: "إضافة عرض نفايات", en: "Add Waste Listing" },
  "listing.new.subtitle": {
    ar: "حدّد نوع المادة والكمية والوحدة لعرض نفاياتك في السوق",
    en: "Specify the material type, quantity, and unit to list your waste in the marketplace",
  },
  "listing.form.material": { ar: "تصنيف المادة", en: "Material Category" },
  "listing.form.subcategory": { ar: "التصنيف الفرعي (اختياري)", en: "Subcategory (Optional)" },
  "listing.form.subcategory.placeholder": { ar: "اختر التصنيف الفرعي", en: "Select subcategory" },
  "listing.form.quantity": { ar: "الكمية", en: "Quantity" },
  "listing.form.unit": { ar: "الوحدة", en: "Unit" },
  "listing.form.city": { ar: "المدينة", en: "City" },
  "listing.form.description": { ar: "وصف مختصر (اختياري)", en: "Short Description (Optional)" },
  "listing.form.priceHint": { ar: "السعر الإرشادي (ريال) — اختياري", en: "Price Hint (SAR) — Optional" },
  "listing.form.pricingModel": { ar: "نوع التسعير", en: "Pricing Model" },
  "listing.form.pricingModel.fixed.hint": {
    ar: "السعر ثابت ولا يتغير بعد الاتفاق — الأنسب لمعظم صفقات المواد المعاد تدويرها.",
    en: "Price is fixed and does not change after agreement — ideal for most recycling deals.",
  },
  "listing.form.pricingModel.by_weight.hint": {
    ar: "السعر يُحسب بعد الوزن الفعلي عند التسليم — مناسب للمواد التي تتفاوت أوزانها.",
    en: "Price is calculated after actual weighing at delivery — suitable for variable-weight materials.",
  },
  "listing.form.section.material": { ar: "المواد والموقع", en: "Material & Location" },
  "listing.form.section.pricing": { ar: "التسعير والإعدادات", en: "Pricing & Settings" },
  "listing.form.section.details": { ar: "التفاصيل والصور", en: "Details & Media" },
  "listing.form.image": { ar: "صورة العرض (اختياري)", en: "Listing Image (Optional)" },
  "listing.form.image.prompt": { ar: "انقر لرفع صورة", en: "Click to upload an image" },
  "listing.form.image.hint": { ar: "JPG أو PNG · حتى 5 ميجابايت", en: "JPG or PNG · up to 5 MB" },
  "listing.form.submit": { ar: "نشر العرض", en: "Publish Listing" },
  "listing.form.saving": { ar: "جاري النشر...", en: "Publishing..." },
  "listing.form.uploading": { ar: "جاري رفع الصورة...", en: "Uploading image..." },
  "listing.form.error": { ar: "تعذر نشر العرض. تأكد من البيانات وحاول مرة أخرى.", en: "Could not publish the listing. Check your inputs and try again." },
  "listing.form.error.license_invalid": { ar: "لا يمكن نشر عرض جديد. الترخيص الحالي لشركتك غير صالح. تواصل مع الدعم.", en: "Cannot post a new listing. Your company's license has been rejected or expired. Please contact support." },
  "listing.form.error.revenue_share_pct_required": { ar: "أدخل نسبة تشارك الإيرادات (1–100) لإتمام النشر.", en: "Enter a revenue share percentage (1–100) to publish the listing." },

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
  "marketplace.stats.listings":  { ar: "إعلانات متاحة", en: "Available listings" },
  "marketplace.stats.cities":    { ar: "مدن", en: "Cities" },
  "marketplace.stats.materials": { ar: "أنواع مواد", en: "Material types" },
  "marketplace.stats.priced":    { ar: "بسعر إرشادي", en: "With price guide" },

  // Listing card / detail
  "listing.category": { ar: "الفئة", en: "Category" },
  "listing.quantity": { ar: "الكمية", en: "Quantity" },
  "listing.city": { ar: "المدينة", en: "City" },
  "listing.priceHint": { ar: "السعر الإرشادي", en: "Price Hint" },
  "listing.publishedBy": { ar: "نشرها", en: "Published by" },
  "listing.publishedOn": { ar: "تاريخ النشر", en: "Published" },
  "listing.sar": { ar: "ر.س", en: "SAR" },

  // Generic errors
  "error.generic": { ar: "حدث خطأ. حاول مرة أخرى لاحقاً.", en: "Something went wrong. Please try again later." },
  "error.required": { ar: "هذا الحقل مطلوب", en: "This field is required" },
  "action.title": { ar: "الإجراءات المتاحة", en: "Available Actions" },
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

  "listing.close.pendingOffers.title": { ar: "يوجد عروض لم يُبَت فيها", en: "There are pending offers" },
  "listing.close.pendingOffers.desc": {
    ar: "يوجد {count} عرض لم يُبَت فيه. يمكنك مراجعة العروض وقبول أحدها، أو إغلاق الإعلان وإلغاء جميع العروض.",
    en: "There are {count} pending offer(s). You can review them and accept one, or close the listing and cancel all offers.",
  },
  "listing.close.pendingOffers.review": { ar: "راجع العروض", en: "Review Offers" },
  "listing.close.pendingOffers.forceClose": { ar: "أغلق وألغِ الكل", en: "Close & Cancel All" },

  "listing.offer.cta": { ar: "تقديم عرض سعر", en: "Submit a Price Offer" },
  "listing.offer.hint": {
    ar: "قريباً ستتمكن من المنافسة مع مشترين آخرين وإرسال أفضل سعر مباشرةً إلى المنتج.",
    en: "Soon you'll be able to compete with other buyers and send your best price directly to the producer.",
  },

  // M4 — Offers / Bidding
  "offer.summary.noOffers": { ar: "لا توجد عروض بعد", en: "No offers yet" },
  "offer.summary.count": { ar: "عروض واردة", en: "offers received" },
  "offer.summary.highest": { ar: "أعلى عرض", en: "Highest offer" },
  "offer.summary.perUnit": { ar: "ر.س/وحدة", en: "SAR/unit" },

  "offer.form.price": { ar: "سعرك لكل وحدة (ر.س)", en: "Your price per unit (SAR)" },
  "offer.form.intro": {
    ar: "أدخل سعرك — يمكنك اختيار إدخاله لكل وحدة أو كإجمالي",
    en: "Enter your price — you can enter it per unit or as a total",
  },
  "offer.form.message": { ar: "ملاحظة للمنتج (اختياري)", en: "Note to producer (optional)" },
  "offer.form.submit": { ar: "إرسال العرض", en: "Submit Offer" },
  "offer.form.submitting": { ar: "جاري الإرسال...", en: "Submitting..." },
  "offer.form.improve": { ar: "تحسين عرضي", en: "Improve My Offer" },
  "offer.form.improving": { ar: "جاري التحسين...", en: "Improving..." },
  "offer.form.newPrice": { ar: "السعر الجديد (ر.س/وحدة)", en: "New price (SAR/unit)" },
  "offer.form.mustExceed": { ar: "يجب أن يتجاوز أعلى عرض حالي", en: "Must exceed the current highest offer" },

  "offer.mine.title": { ar: "عرضي الحالي", en: "My Current Offer" },
  "offer.mine.submitted_confirmation": { ar: "تم إرسال عرضك", en: "Your offer has been submitted" },
  "offer.mine.waiting_response": { ar: "بانتظار رد المنتج", en: "Waiting for response" },
  "offer.mine.pending": { ar: "في انتظار رد المنتج", en: "Awaiting producer response" },
  "offer.mine.accepted": { ar: "تهانينا! تم قبول عرضك", en: "Congratulations! Your offer was accepted" },
  "offer.mine.rejected": { ar: "تم رفض عرضك", en: "Your offer was rejected" },
  "offer.mine.total": { ar: "الإجمالي المقدَّر", en: "Estimated total" },
  "offer.mine.improve.hint": { ar: "يمكنك تحسين عرضك بسعر أعلى من الأعلى الحالي", en: "You can improve your offer with a price higher than the current highest" },

  "offer.status.pending": { ar: "معلّق", en: "Pending" },
  "offer.status.accepted": { ar: "مقبول", en: "Accepted" },
  "offer.status.rejected": { ar: "مرفوض", en: "Rejected" },
  "offer.status.withdrawn": { ar: "مسحوب", en: "Withdrawn" },
  "offer.withdraw.button": { ar: "سحب العرض", en: "Withdraw Offer" },
  "offer.withdraw.confirm.title": { ar: "سحب العرض؟", en: "Withdraw offer?" },
  "offer.withdraw.confirm.desc": { ar: "سيُلغى عرضك نهائيًا. يمكنك تقديم عرض جديد لاحقًا.", en: "Your offer will be cancelled. You can submit a new offer later." },
  "offer.withdraw.confirm.action": { ar: "نعم، سحب", en: "Yes, withdraw" },

  "offer.producer.title": { ar: "العروض الواردة", en: "Incoming Offers" },
  "offer.producer.empty": { ar: "لا توجد عروض بعد. سيتواصل المشترون قريباً.", en: "No offers yet. Buyers will reach out soon." },
  "offer.producer.company": { ar: "الشركة", en: "Company" },
  "offer.producer.pricePerUnit": { ar: "السعر / وحدة", en: "Price / unit" },
  "offer.producer.total": { ar: "الإجمالي المقدَّر", en: "Est. total" },

  "offer.accept": { ar: "قبول", en: "Accept" },
  "offer.reject": { ar: "رفض", en: "Reject" },
  "offer.accepting": { ar: "جاري القبول...", en: "Accepting..." },
  "offer.rejecting": { ar: "جاري الرفض...", en: "Rejecting..." },

  "offer.accept.confirm.title": { ar: "تأكيد قبول العرض", en: "Confirm Offer Acceptance" },
  "offer.accept.confirm.desc": {
    ar: "قبول هذا العرض سيغلق الإعلان تلقائياً ويرفض جميع العروض الأخرى. هذا الإجراء نهائي.",
    en: "Accepting this offer will automatically close the listing and reject all other offers. This action is final.",
  },
  "offer.accept.confirm.action": { ar: "قبول وإغلاق الإعلان", en: "Accept & Close Listing" },
  "offer.reject.confirm.title": { ar: "تأكيد رفض العرض", en: "Confirm Offer Rejection" },
  "offer.reject.confirm.desc": { ar: "هل تريد رفض هذا العرض؟", en: "Are you sure you want to reject this offer?" },
  "offer.reject.confirm.action": { ar: "رفض العرض", en: "Reject Offer" },

  "offer.error.tooLow": { ar: "يجب أن يكون سعرك أعلى من العرض الأعلى الحالي", en: "Your price must be higher than the current highest offer" },
  "offer.error.MissingCapability": { ar: "شركتك لا تمتلك الخدمة المطلوبة لهذا العرض. راجع خدمات شركتك أولاً.", en: "Your company does not have the required service for this listing. Review your company capabilities first." },
  "offer.error.LicenseRequired": { ar: "هذا العرض يتطلب ترخيصاً معتمداً. يُرجى رفع ترخيصك وانتظار المراجعة قبل المشاركة.", en: "This listing requires an approved license. Please upload your license and wait for review before participating." },
  "offer.error.TargetingRestricted": { ar: "هذا العرض خاص وغير موجّه لشركتك.", en: "This listing is restricted and was not directed to your company." },
  "offer.error.generic": { ar: "تعذر إرسال العرض. حاول مرة أخرى.", en: "Could not submit the offer. Please try again." },

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

  // M4.5 — F1: close warning with pending count
  "listing.close.confirm.pendingOffers": {
    ar: "سيتم رفض {count} عرض معلّق تلقائياً عند الإغلاق.",
    en: "{count} pending offer(s) will be automatically rejected.",
  },
  "listing.close.confirm.noPending": {
    ar: "لا توجد عروض معلّقة. يمكنك إغلاق الإعلان بأمان.",
    en: "No pending offers. The listing can be closed safely.",
  },

  // M4.5 — F2: buyer status badge (already have offer.status.*)

  // M4.5 — F3: rejection reason dialog
  "offer.reject.reason.label": { ar: "سبب الرفض", en: "Rejection Reason" },
  "offer.reject.reason.required": { ar: "يجب اختيار سبب الرفض", en: "Rejection reason is required" },
  "offer.reject.reason.detail.label": { ar: "تفاصيل إضافية (اختياري للسبب الآخر)", en: "Additional detail (optional for 'other')" },
  "offer.reject.reason.price_too_low": { ar: "السعر منخفض جداً", en: "Price too low" },
  "offer.reject.reason.quantity_mismatch": { ar: "الكمية غير مناسبة", en: "Quantity mismatch" },
  "offer.reject.reason.not_interested": { ar: "غير مهتم", en: "Not interested" },
  "offer.reject.reason.other": { ar: "أخرى", en: "Other" },
  // Machine-generated reason codes (shown to buyer on rejection)
  "offer.reject.reason.listing_closed": { ar: "تم إغلاق الإعلان", en: "Listing was closed" },
  "offer.reject.reason.offer_accepted": { ar: "تم قبول عرض آخر", en: "Another offer was accepted" },
  "offer.mine.rejectionReason": { ar: "سبب الرفض", en: "Reason" },

  // M4.5 — F4: accept with lower price reason
  "offer.accept.reason.label": { ar: "سبب قبول عرض أقل", en: "Reason for accepting lower offer" },
  "offer.accept.reason.placeholder": {
    ar: "مثال: علاقات تجارية، شروط توصيل أفضل...",
    en: "e.g. Long-term relationship, better delivery terms...",
  },
  "offer.accept.reason.required": {
    ar: "يجب ذكر سبب قبول عرض أقل من الأعلى الحالي",
    en: "A reason is required when accepting an offer lower than the current highest",
  },
  "offer.accept.lowerThanHighest": {
    ar: "تنبيه: هذا العرض أقل من أعلى عرض حالي. يجب ذكر السبب.",
    en: "Note: This offer is lower than the current highest. A reason is required.",
  },

  // M4.5 — F6: rank display
  "offer.rank.label": { ar: "ترتيبك", en: "Your Rank" },
  "offer.rank.of": { ar: "من", en: "of" },
  "offer.rank.top": { ar: "الأعلى سعراً", en: "Top offer" },

  // M4.5 — F7: my listings tabs
  "myListings.tab.active": { ar: "النشطة", en: "Active" },
  "myListings.tab.closed": { ar: "المغلقة", en: "Closed" },
  "myListings.viewOffers": { ar: "عرض العروض", en: "View Offers" },
  "myListings.offersCount": { ar: "عروض", en: "offers" },

  // M4.5 — F14: quantity disclaimer
  "offer.quantityDisclaimer": { ar: "* الكمية تقديرية", en: "* Quantity is approximate" },

  // M4.5 — M2: My Participations
  "participations.title": { ar: "مشاركاتي", en: "My Participations" },
  "participations.subtitle": {
    ar: "عروض الأسعار التي قدّمتها على إعلانات النفايات",
    en: "Price offers you've submitted on waste listings",
  },
  "participations.empty.title": { ar: "لا توجد مشاركات بعد", en: "No participations yet" },
  "participations.empty.desc": {
    ar: "ابدأ بتصفح السوق وتقديم أول عرض سعر لك.",
    en: "Start by browsing the marketplace and submitting your first offer.",
  },
  "participations.goToMarketplace": { ar: "اذهب إلى السوق", en: "Go to Marketplace" },
  "participations.tab.all": { ar: "الكل", en: "All" },
  "participations.tab.pending": { ar: "المعلقة", en: "Pending" },
  "participations.tab.accepted": { ar: "المقبولة", en: "Accepted" },
  "participations.tab.rejected": { ar: "المرفوضة", en: "Rejected" },
  "participations.winner.label": { ar: "تهانينا! فزت بهذه الصفقة", en: "Congratulations! You won this deal" },
  "participations.rejected.reason": { ar: "السبب:", en: "Reason:" },
  "participations.listing.closedAt": { ar: "أُغلق في", en: "Closed on" },
  "participations.listing.acceptedTotal": { ar: "الإجمالي المقبول", en: "Accepted total" },
  "participations.offer.submitted": { ar: "عرضك", en: "Your offer" },
  "participations.listingRef": { ar: "رقم الإعلان", en: "Listing ref" },

  // M5-Pre — Deal lifecycle panel
  "deal.panel.title": { ar: "تفاصيل الصفقة", en: "Deal Details" },
  "deal.contact.title": { ar: "تواصل مع الطرف الآخر", en: "Contact Counterparty" },
  "deal.contact.phone": { ar: "رقم التواصل", en: "Phone" },
  "deal.contact.phone_missing": { ar: "رقم التواصل غير متاح", en: "Contact number not available" },
  "deal.contact.congratulations": { ar: "تهانينا — تم إنشاء الصفقة", en: "Congratulations — deal created" },
  "deal.contact.can_now_contact": { ar: "يمكنك التواصل الآن مع الطرف الآخر لترتيب الدفع والاستلام", en: "You can now contact the other party to arrange payment and collection" },
  "deal.contact.recorded_hint": { ar: "هذه الصفقة مسجّلة الآن في تدويرة", en: "This deal is now recorded in Tadweerah" },
  "deal.contact.counterparty_label": { ar: "بيانات التواصل", en: "Contact Details" },
  "deal.ref.label": { ar: "مرجع الصفقة", en: "Deal Reference" },
  "deal.ref.copy": { ar: "نسخ الرقم", en: "Copy reference" },
  "deal.ref.copied": { ar: "تم النسخ", en: "Copied" },
  "deal.created_on": { ar: "تاريخ الصفقة", en: "Deal date" },
  "listing.form.unit_notes": { ar: "وصف الوحدة (اختياري)", en: "Unit description (optional)" },
  "listing.form.unit_notes.required_label": { ar: "وصف الوحدة *", en: "Unit description *" },
  "listing.form.unit_notes.required": { ar: "يجب تحديد وصف الوحدة عند اختيار 'أخرى'", en: "Unit description is required when 'Other' is selected" },
  "listing.form.unit_notes.placeholder": { ar: "مثال: جولة، شحنة، رحلة...", en: "e.g. journey, shipment, trip..." },

  "deal.status.active": { ar: "انتظار تأكيد الدفع", en: "Awaiting Payment" },
  "deal.status.payment_confirmed": { ar: "تم تأكيد الدفع", en: "Payment Confirmed" },
  "deal.status.dispatched": { ar: "البضاعة في الطريق", en: "Goods in Transit" },
  "deal.status.completed": { ar: "مكتملة", en: "Completed" },

  "deal.settlement.fixed": { ar: "سعر ثابت", en: "Fixed Price" },
  "deal.settlement.by_weight": { ar: "حسب الوزن الفعلي", en: "By Actual Weight" },
  "deal.settlement.revenue_share": { ar: "مشاركة الإيرادات", en: "Revenue Share" },
  "deal.settlement.label": { ar: "نوع التسوية", en: "Settlement Type" },
  "deal.field.price_per_unit": { ar: "السعر لكل وحدة", en: "Price per unit" },
  "deal.field.estimated_amount": { ar: "المبلغ التقديري *", en: "Estimated amount *" },
  "deal.field.actual_quantity": { ar: "الكمية الفعلية", en: "Actual quantity" },
  "deal.field.final_amount": { ar: "المبلغ النهائي", en: "Final amount" },
  "deal.field.quantity.placeholder": { ar: "أدخل الكمية الفعلية", en: "Enter actual quantity" },

  "deal.action.confirm_payment": { ar: "تأكيد الدفع", en: "Confirm Payment" },
  "deal.action.confirm_dispatch": { ar: "تأكيد إرسال البضاعة", en: "Confirm Dispatch" },
  "deal.action.confirm_receipt": { ar: "تأكيد استلام البضاعة", en: "Confirm Receipt" },

  "deal.timestamp.payment_confirmed": { ar: "تم تأكيد الدفع", en: "Payment confirmed" },
  "deal.timestamp.dispatched": { ar: "تم إرسال البضاعة", en: "Goods dispatched" },
  "deal.timestamp.received": { ar: "تم استلام البضاعة", en: "Goods received" },
  "deal.timestamp.completed": { ar: "الصفقة مكتملة", en: "Deal completed" },

  "deal.error.invalid_state": { ar: "هذه الخطوة غير متاحة الآن", en: "This step is not available now" },
  "deal.error.generic": { ar: "حدث خطأ، يرجى المحاولة مجدداً", en: "An error occurred, please try again" },

  "deal.disclaimer": { ar: "* المبلغ تقديري بناءً على الكمية المُعلنة", en: "* Amount is estimated based on the listed quantity" },

  // Deal status badge in my-listings (producer view)
  "myListings.deal.active": { ar: "صفقة جارية", en: "Deal in progress" },
  "myListings.deal.completed": { ar: "صفقة مكتملة", en: "Deal completed" },

  // Copy to clipboard
  "action.copy": { ar: "نسخ", en: "Copy" },
  "action.copied": { ar: "تم النسخ ✓", en: "Copied ✓" },

  // Summary stats bar
  "stats.open_listings": { ar: "إعلانات مفتوحة", en: "Open listings" },
  "stats.active_deals": { ar: "صفقات نشطة", en: "Active deals" },
  "stats.my_turn": { ar: "بانتظارك", en: "Awaiting your action" },
  "stats.completed": { ar: "مكتملة", en: "Completed" },
  "stats.pending_offers": { ar: "عروض قيد المراجعة", en: "Offers under review" },
  "stats.rejected": { ar: "مرفوضة", en: "Rejected" },

  // Pricing model labels
  "listing.pricing_model.fixed": { ar: "سعر ثابت", en: "Fixed price" },
  "listing.pricing_model.by_weight": { ar: "سعر بالوزن", en: "Price by weight" },
  "listing.pricing_model.revenue_share": { ar: "مشاركة الإيرادات", en: "Revenue Share" },
  "listing.form.pricingModel.revenue_share.hint": {
    ar: "يحصل المنتج على نسبة مئوية من إيرادات المشتري بدلاً من سعر ثابت.",
    en: "Producer receives a percentage of the buyer's revenue instead of a fixed price.",
  },
  "listing.form.revenue_share_pct": { ar: "نسبة مشاركة الإيرادات (%)", en: "Revenue Share %" },
  "listing.form.revenue_share_pct.hint": {
    ar: "النسبة المئوية التقديرية للمنتج من إيرادات المشتري (للعرض فقط).",
    en: "Indicative percentage of buyer revenue for the producer (display only).",
  },
  "listing.form.requiredServices": { ar: "الخدمات المطلوبة (اختياري)", en: "Required Services (Optional)" },
  "listing.form.requiredServices.hint": {
    ar: "حدد الخدمات أو الشهادات التي يجب أن يمتلكها المشتري للتقديم.",
    en: "Select services or certifications the buyer must hold to submit an offer.",
  },
  "listing.bid.top": { ar: "أنت أعلى عرض", en: "You're top bidder" },
  "listing.bid.not_top": { ar: "عرضك ليس الأعلى", en: "Not the top offer" },
  "listing.required_services.label": { ar: "خدمات مطلوبة", en: "Required services" },
  "report.button": { ar: "الإبلاغ عن مشكلة", en: "Report Issue" },
  "report.modal.title": { ar: "الإبلاغ عن مشكلة", en: "Report an Issue" },
  "report.modal.description": { ar: "صف المشكلة التي واجهتها وسنتابعها في أقرب وقت.", en: "Describe the issue you encountered and we will follow up shortly." },
  "report.modal.placeholder": { ar: "صف المشكلة بإيجاز...", en: "Describe the issue briefly..." },
  "report.modal.submit": { ar: "إرسال", en: "Send" },
  "report.modal.sending": { ar: "جاري الإرسال...", en: "Sending..." },
  "report.modal.success": { ar: "شكراً! تم استلام بلاغك وسنتواصل معك قريباً.", en: "Thank you! Your report has been received." },
  "report.modal.error": { ar: "تعذّر الإرسال. حاول مرة أخرى.", en: "Could not send. Please try again." },
  "report.modal.min_length": { ar: "يجب أن يكون الوصف 5 أحرف على الأقل", en: "Description must be at least 5 characters" },

  "notification.title": { ar: "الإشعارات", en: "Notifications" },
  "notification.bell.label": { ar: "الإشعارات", en: "Notifications" },
  "notification.empty": { ar: "لا توجد إشعارات", en: "No notifications" },
  "notification.mark_all_read": { ar: "تحديد الكل كمقروء", en: "Mark all as read" },
  "notification.unread": { ar: "غير مقروء", en: "Unread" },

  // Deal stepper section title
  "deal.stepper.title": { ar: "مراحل الصفقة", en: "Deal stages" },

  // Role labels in DealPanel
  "deal.role.producer": { ar: "أنت المنتج", en: "You: Producer" },
  "deal.role.buyer": { ar: "أنت المشتري", en: "You: Buyer" },
  "deal.role.your_turn": { ar: "الإجراء مطلوب منك الآن", en: "Action required from you now" },
  "deal.role.not_your_turn": { ar: "لا يلزمك إجراء الآن", en: "No action required from you now" },

  // Deal stage labels for participations page (buyer perspective)
  "participations.deal.active": { ar: "بانتظار تأكيد الدفع", en: "Awaiting payment confirmation" },
  "participations.deal.payment_confirmed": { ar: "بانتظار الشحن", en: "Awaiting dispatch" },
  "participations.deal.dispatched": { ar: "بانتظار تأكيد الاستلام", en: "Awaiting receipt confirmation" },
  "participations.deal.completed": { ar: "مكتملة ✓", en: "Completed ✓" },

  // Waiting-for status — who acts next
  "deal.waiting.active": { ar: "بانتظار المنتج لتأكيد الدفع", en: "Waiting for producer to confirm payment" },
  "deal.waiting.payment_confirmed": { ar: "بانتظار المنتج لتأكيد إرسال البضاعة", en: "Waiting for producer to confirm dispatch" },
  "deal.waiting.dispatched": { ar: "بانتظار المشتري لتأكيد استلام البضاعة", en: "Waiting for buyer to confirm receipt" },

  // Confirmation dialogs
  "deal.confirm.payment.title": { ar: "تأكيد الدفع", en: "Confirm Payment" },
  "deal.confirm.payment.desc": { ar: "هل تأكدت من تحصيل الدفع من المشتري؟ لا يمكن التراجع عن هذه الخطوة.", en: "Have you confirmed receipt of payment from the buyer? This step cannot be undone." },
  "deal.confirm.dispatch.title": { ar: "تأكيد إرسال البضاعة", en: "Confirm Dispatch" },
  "deal.confirm.dispatch.desc": { ar: "هل تأكدت من إرسال البضاعة للمشتري؟ لا يمكن التراجع عن هذه الخطوة.", en: "Have you dispatched the goods to the buyer? This step cannot be undone." },
  "deal.confirm.receipt.title": { ar: "تأكيد استلام البضاعة", en: "Confirm Receipt" },
  "deal.confirm.receipt.desc": { ar: "هل تأكدت من استلام البضاعة من المنتج؟ لا يمكن التراجع عن هذه الخطوة.", en: "Have you received the goods from the producer? This step cannot be undone." },

  // Item 3 — Payment reference
  "deal.field.payment_reference": { ar: "رقم الحوالة / مرجع الدفع", en: "Transfer Reference No." },
  "deal.field.payment_reference.placeholder": { ar: "مثال: TRF-20241201-001", en: "e.g. TRF-20241201-001" },
  "deal.field.payment_reference.hint": { ar: "أدخل رقم الحوالة البنكية أو مرجع العملية", en: "Enter bank transfer number or transaction reference" },
  "deal.field.payment_proof_url": { ar: "إرفاق إثبات الدفع (اختياري)", en: "Attach Payment Proof (Optional)" },
  "deal.field.payment_proof_url.placeholder": { ar: "رابط الصورة أو الوثيقة", en: "Image or document URL" },
  "deal.error.payment_reference_required": { ar: "رقم مرجع الدفع مطلوب", en: "Payment reference is required" },

  // Item 2 — Self-bidding warning
  "offer.warning.already_top": {
    ar: "أنت حالياً أعلى مزايد على هذا الإعلان. يمكنك رفع عرضك إذا رأيت مناسبًا.",
    en: "You are currently the top bidder on this listing. You may raise your offer if you wish.",
  },

  // Targeting type (private deal / category-targeted)
  "listing.targeting.label": { ar: "نطاق الإعلان", en: "Listing Access" },
  "listing.targeting.open": { ar: "مفتوح للجميع", en: "Open to all" },
  "listing.targeting.category": { ar: "مخصص لتصنيف معين", en: "Category-targeted" },
  "listing.targeting.specific_company": { ar: "صفقة خاصة", en: "Private deal" },
  "listing.targeting.banner.seller": { ar: "أنشأت هذا الإعلان كصفقة خاصة موجهة لشركة محددة فقط — لا يمكن لأي شركة أخرى رؤيته", en: "You created this as a private deal — only the targeted company can view and bid. No other company can see it." },
  "listing.targeting.banner.seller.category": { ar: "أنشأت هذا الإعلان مخصصاً لتصنيفات تجارية محددة — لن تراه إلا الشركات ضمن تلك التصنيفات", en: "You created this listing targeted to selected business categories — only companies in those categories can see it." },
  "listing.targeting.banner.buyer.private": { ar: "هذه الصفقة الخاصة موجهة حصرياً لشركتك — أنتم الوحيدون المدعوون للمشاركة", en: "This private deal was directed exclusively to your company — you are the only invited bidder" },
  "listing.targeting.banner.buyer.category": { ar: "هذا الإعلان مخصص للشركات في تصنيفات تجارية محددة، وشركتك ضمن هذه التصنيفات", en: "This listing is targeted to specific business categories — your company qualifies" },

  // Targeting form UI (create listing)
  "listing.form.targeting.label": { ar: "من يمكنه رؤية هذا الإعلان؟", en: "Who can see this listing?" },
  "listing.form.targeting.hint": {
    ar: "في البيع المباشر يمكنك تقييد الوصول إلى شركة بعينها أو تصنيف معين.",
    en: "For Direct Sale you can restrict access to a specific company or category.",
  },
  "listing.form.targeting.companyId.label": { ar: "معرّف الشركة المستهدفة", en: "Target Company ID" },
  "listing.form.targeting.companyId.placeholder": { ar: "الصق UUID الشركة هنا", en: "Paste the company UUID here" },
  "listing.form.targeting.companyId.hint": {
    ar: "يمكن للشركة المستهدفة فقط رؤية هذا الإعلان وتقديم عروضها عليه. تلقى إشعارًا فورًا.",
    en: "Only the target company will see this listing and can submit an offer. They receive a notification immediately.",
  },

  // Notification: private deal invitation
  "notification.private_deal_invitation.title": { ar: "عرض خاص بك", en: "Private deal for you" },
  "notification.private_deal_invitation.body": {
    ar: "تلقيت دعوة لعرض خاص. راجع الإعلان وشارك بعرضك.",
    en: "You received a private listing invitation. Review it and submit your offer.",
  },

  // Item 6 — Sale type
  "listing.sale_type.auction": { ar: "مزاد مفتوح", en: "Open Auction" },
  "listing.sale_type.direct": { ar: "بيع مباشر", en: "Direct Sale" },
  "listing.form.saleType": { ar: "نوع البيع", en: "Sale Type" },
  "listing.form.saleType.auction.hint": {
    ar: "يتنافس المشترون بأسعار متزايدة — المنتج يختار أفضل عرض.",
    en: "Buyers compete with increasing prices — producer selects the best offer.",
  },
  "listing.form.saleType.direct.hint": {
    ar: "يشتري المشتري بالسعر الإرشادي مباشرة دون منافسة.",
    en: "Buyer purchases at the listed price directly without competition.",
  },

  // Item 4 — Company category
  "onboarding.form.companyCategory": { ar: "تصنيف الشركة (اختياري)", en: "Company Category (Optional)" },
  "onboarding.form.companyCategory.placeholder": { ar: "اختر تصنيفًا", en: "Select a category" },

  // Item 8 — Terms & Conditions
  "onboarding.terms.label": {
    ar: "أوافق على شروط الاستخدام وسياسة الخصوصية",
    en: "I agree to the Terms of Use and Privacy Policy",
  },
  "onboarding.terms.link": { ar: "اقرأ الشروط والأحكام", en: "Read Terms & Conditions" },
  "onboarding.terms.required": { ar: "يجب الموافقة على الشروط للمتابعة", en: "You must agree to the terms to continue" },

  // Item 11 — License fields in onboarding
  "onboarding.form.license_number": { ar: "رقم الترخيص (اختياري)", en: "License Number (Optional)" },
  "onboarding.form.license_number.hint": {
    ar: "رقم ترخيص مزاولة النشاط (من الجهة المانحة مثل هيئة المناطق أو البلديات)",
    en: "Activity license number from the issuing authority (e.g. Municipalities, MOMRA)",
  },
  "onboarding.form.license_pending": {
    ar: "سيتم مراجعة الترخيص من قِبل فريق تدويرة قبل تفعيل حسابك بالكامل.",
    en: "Your license will be reviewed by the Tadweerah team before your account is fully activated.",
  },

  // License status labels
  "capability.requires_license": { ar: "يتطلب ترخيص", en: "Requires License" },
  "license.status.pending": { ar: "قيد المراجعة", en: "Under Review" },
  "license.status.approved": { ar: "معتمد", en: "Approved" },
  "license.status.rejected": { ar: "مرفوض", en: "Rejected" },
  "license.status.expired": { ar: "منتهي الصلاحية", en: "Expired" },
  "license.blocked.title": { ar: "حسابك قيد المراجعة", en: "Account Under Review" },
  "license.blocked.desc": {
    ar: "يتطلب هذا الإجراء موافقة الترخيص. سيتواصل معك الفريق قريباً.",
    en: "This action requires license approval. Our team will be in touch shortly.",
  },

  // Item 10 — Reports page
  "reports.title": { ar: "التقارير والاستدامة", en: "Reports & Sustainability" },
  "reports.subtitle": { ar: "تتبع أثرك البيئي وإنجازاتك على منصة تدويرة", en: "Track your environmental impact and achievements on Tadweerah" },
  "reports.coming.title": { ar: "قريباً — تقارير الاستدامة", en: "Coming Soon — Sustainability Reports" },
  "reports.coming.desc": {
    ar: "ستتمكن قريباً من تتبع كمية المواد المعاد تدويرها، والانبعاثات الكربونية الموفَّرة، وعدد الصفقات المكتملة.",
    en: "Soon you'll be able to track recycled material volumes, saved carbon emissions, and completed deal counts.",
  },
  "reports.metric.co2": { ar: "طن CO₂ موفَّر", en: "CO₂ Tonnes Saved" },
  "reports.metric.weight": { ar: "كجم مواد مُعاد تدويرها", en: "Kg Materials Recycled" },
  "reports.metric.deals": { ar: "صفقات مكتملة", en: "Deals Completed" },
  "reports.metric.growth": { ar: "نمو شهري", en: "Monthly Growth" },

  // Team Members
  "members.title": { ar: "أعضاء الشركة", en: "Team Members" },
  "members.subtitle": { ar: "أضف زملاءك إلى حساب شركتك وأدِر فريقك", en: "Add colleagues to your company account and manage your team" },
  "members.empty": { ar: "لا يوجد أعضاء بعد", en: "No members yet" },
  "members.role.owner": { ar: "مالك الحساب", en: "Account Owner" },
  "members.role.member": { ar: "عضو", en: "Member" },
  "members.role.you": { ar: "أنت", en: "you" },
  "members.invite.title": { ar: "دعوة عضو جديد", en: "Invite a New Member" },
  "members.invite.hint": { ar: "أدخل معرّف المستخدم (Clerk User ID) للشخص الذي تريد إضافته. يجب ألّا يكون منتسباً لشركة أخرى.", en: "Enter the Clerk User ID of the person you want to add. They must not already belong to another company." },
  "members.invite.placeholder": { ar: "user_2....", en: "user_2...." },
  "members.invite.cta": { ar: "إضافة", en: "Add" },
  "members.invite.success": { ar: "تمت إضافة العضو بنجاح", en: "Member added successfully" },
  "members.invite.error.empty": { ar: "يرجى إدخال معرّف المستخدم", en: "Please enter a user ID" },
  "members.invite.error.generic": { ar: "حدث خطأ. يرجى المحاولة مجدداً", en: "Something went wrong. Please try again" },
  "members.remove.cta": { ar: "إزالة العضو", en: "Remove Member" },
  "members.remove.error.generic": { ar: "فشل إزالة العضو. يرجى المحاولة مرة أخرى.", en: "Failed to remove member. Please try again." },
  "members.remove.confirm.title": { ar: "تأكيد إزالة العضو", en: "Confirm Member Removal" },
  "members.remove.confirm.desc": { ar: "هل أنت متأكد من إزالة هذا العضو من شركتك؟ لن يتمكن بعد ذلك من الوصول إلى أي من بياناتها.", en: "Are you sure you want to remove this member from your company? They will no longer have access to any company data." },
  "members.section.owner": { ar: "مالك الحساب", en: "Account Owner" },
  "members.section.members": { ar: "أعضاء الفريق", en: "Team Members" },
  "members.noMembers": { ar: "لا يوجد أعضاء إضافيون بعد", en: "No additional members yet" },
  "members.userId.label": { ar: "معرّف المستخدم", en: "User ID" },
  "members.userId.copied": { ar: "تم النسخ!", en: "Copied!" },
  "members.dashboard.title": { ar: "أعضاء الفريق", en: "Team Members" },
  "members.dashboard.subtitle": { ar: "أضف زملاءك وادر فريق شركتك على المنصة", en: "Add colleagues and manage your company team on the platform" },

  // Capabilities
  "capabilities.title": { ar: "خدمات الشركة", en: "Company Capabilities" },
  "capabilities.subtitle": { ar: "حدد ما تستطيع شركتك تقديمه", en: "Select what your company can offer" },
  "capabilities.saving": { ar: "جاري الحفظ...", en: "Saving..." },
  "capabilities.saved": { ar: "تم الحفظ", en: "Saved" },
  "capabilities.error": { ar: "حدث خطأ أثناء الحفظ", en: "Failed to save capabilities" },
  "capabilities.empty": { ar: "لا توجد خدمات متاحة", en: "No capabilities available" },

  // Item 8 — Terms page content
  "terms.title": { ar: "الشروط والأحكام", en: "Terms & Conditions" },
  "terms.subtitle": { ar: "يرجى قراءة هذه الشروط بعناية قبل استخدام المنصة", en: "Please read these terms carefully before using the platform" },
  "terms.lastUpdated": { ar: "آخر تحديث: أبريل 2026", en: "Last updated: April 2026" },
  "terms.support": { ar: "للتواصل والدعم: info@tadweerah.com", en: "For support: info@tadweerah.com" },
  "support.label": { ar: "الدعم", en: "Support" },
  "support.deal_panel": {
    ar: "إذا واجهت أي مشكلة، تواصل معنا على info@tadweerah.com",
    en: "If you face any issue, contact us at info@tadweerah.com",
  },
  "terms.section1.title": { ar: "١. القبول والموافقة", en: "1. Acceptance" },
  "terms.section1.body": {
    ar: "باستخدامك لمنصة تدويرة، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، فلا يحق لك استخدام المنصة.",
    en: "By using Tadweerah, you agree to be bound by these terms and conditions. If you do not agree to any of these terms, you may not use the platform.",
  },
  "terms.section2.title": { ar: "٢. الأهلية والترخيص", en: "2. Eligibility & Licensing" },
  "terms.section2.body": {
    ar: "يجب أن تكون شركة أو مؤسسة مرخّصة قانونياً في المملكة العربية السعودية لاستخدام المنصة. تحتفظ تدويرة بالحق في التحقق من صحة التراخيص وتعليق الحسابات غير الممتثلة.",
    en: "You must be a legally registered company or entity in Saudi Arabia to use the platform. Tadweerah reserves the right to verify licenses and suspend non-compliant accounts.",
  },
  "terms.section3.title": { ar: "٣. المعاملات والصفقات", en: "3. Transactions & Deals" },
  "terms.section3.body": {
    ar: "تدويرة منصة وسيطة تسهّل الصفقات بين الأطراف. المنصة غير مسؤولة عن جودة البضاعة أو سلامة المعاملة المالية بين الطرفين. يتحمل كل طرف مسؤولية التحقق من هوية الطرف الآخر.",
    en: "Tadweerah is an intermediary platform that facilitates transactions between parties. The platform is not responsible for goods quality or the financial transaction between parties. Each party is responsible for verifying the other's identity.",
  },
  "terms.section4.title": { ar: "٤. الخصوصية والبيانات", en: "4. Privacy & Data" },
  "terms.section4.body": {
    ar: "نلتزم بحماية بياناتك وفقاً للأنظمة السعودية ذات الصلة. لن تُشارَك بياناتك مع أطراف ثالثة دون إذنك، باستثناء ما تقتضيه المتطلبات القانونية.",
    en: "We are committed to protecting your data in accordance with relevant Saudi regulations. Your data will not be shared with third parties without your consent, except as required by law.",
  },
  "terms.section5.title": { ar: "٥. التعديلات والإنهاء", en: "5. Amendments & Termination" },
  "terms.section5.body": {
    ar: "تحتفظ تدويرة بالحق في تعديل هذه الشروط في أي وقت. سيُعلَم المستخدمون بأي تغييرات جوهرية. يحق لتدويرة إنهاء أي حساب يخالف هذه الشروط.",
    en: "Tadweerah reserves the right to modify these terms at any time. Users will be notified of any material changes. Tadweerah may terminate any account that violates these terms.",
  },

  // P1 — AlreadyTopBidder confirmation
  "offer.error.AlreadyTopBidder": {
    ar: "أنت بالفعل أعلى مزايد. يرجى تأكيد رغبتك في رفع عرضك أولاً.",
    en: "You are already the top bidder. Please confirm you want to raise your offer.",
  },
  "offer.confirm.alreadyTop.checkbox": {
    ar: "أعلم أنني أعلى مزايد وأريد رفع عرضي بشكل مقصود",
    en: "I know I am already the top bidder and I intentionally want to raise my offer",
  },
  "offer.confirm.alreadyTop.popup.title": {
    ar: "أنت الأعلى مزايدة حالياً",
    en: "You are currently the top bidder",
  },
  "offer.confirm.alreadyTop.popup.desc": {
    ar: "عرضك الحالي هو الأعلى على هذا الإعلان. هل تريد رفع عرضك؟ هذا لن يلغي الصفقة الحالية، لكنه سيزيد من التزامك.",
    en: "Your offer is currently the highest on this listing. Do you want to raise it anyway? This won't cancel anything, but your committed price will increase.",
  },
  "offer.confirm.alreadyTop.popup.confirm": {
    ar: "نعم، أرفع عرضي",
    en: "Yes, raise my offer",
  },
  "offer.confirm.alreadyTop.popup.cancel": {
    ar: "لا، أبقى على عرضي الحالي",
    en: "No, keep my current offer",
  },
  "myListings.highestOffer.label": { ar: "أعلى عرض", en: "Top offer" },
  "myListings.highestOffer.total": { ar: "الإجمالي", en: "Total" },

  // P2 — Dual price entry
  "offer.form.mode.unit": { ar: "سعر الوحدة", en: "Per unit" },
  "offer.form.mode.total": { ar: "الإجمالي", en: "Total" },
  "offer.form.unitPriceLabel": { ar: "سعرك لكل وحدة (ر.س)", en: "Your price per unit (SAR)" },
  "offer.form.totalPriceLabel": { ar: "إجمالي سعرك (ر.س)", en: "Your total price (SAR)" },
  "offer.form.computedUnit": { ar: "يعادل لكل وحدة", en: "Equals per unit" },
  "offer.form.computedTotal": { ar: "الإجمالي المقدّر", en: "Estimated total" },

  // P3 — Offer amounts on cards
  "listing.bid.highest.label": { ar: "أعلى عرض", en: "Highest offer" },
  "listing.bid.mine.label": { ar: "عرضي", en: "My offer" },
  "listing.card.offers_count": { ar: "عروض", en: "offers" },
  "listing.card.no_offers": { ar: "لا توجد عروض بعد", en: "No offers yet" },

  // P4 — Deal stage descriptions (deal.status.active / dispatched already updated above)
  "deal.stage.action.active.producer": {
    ar: "أدخل رقم الحوالة وأكّد تأكيد الدفع",
    en: "Enter the transfer reference and confirm payment",
  },
  "deal.stage.action.active.buyer": {
    ar: "في انتظار المنتج لتأكيد الدفع",
    en: "Waiting for the producer to confirm payment",
  },
  "deal.stage.action.payment_confirmed.producer": {
    ar: "أكّد شحن البضاعة وإرسالها للمشتري",
    en: "Confirm the goods have been dispatched to the buyer",
  },
  "deal.stage.action.payment_confirmed.buyer": {
    ar: "في انتظار المنتج لشحن البضاعة",
    en: "Waiting for the producer to dispatch the goods",
  },
  "deal.stage.action.dispatched.buyer": {
    ar: "تأكّد من استلام البضاعة ثم أكّد الاستلام",
    en: "Verify you have received the goods then confirm receipt",
  },
  "deal.stage.action.dispatched.producer": {
    ar: "في انتظار المشتري لتأكيد استلام البضاعة",
    en: "Waiting for the buyer to confirm receipt of goods",
  },

  // P5 — Company search for direct-sale targeting
  "listing.form.targeting.companySearch.placeholder": { ar: "اكتب اسم الشركة...", en: "Type company name..." },
  "listing.form.targeting.companySearch.hint": {
    ar: "ابحث باسم الشركة واختر الشركة المستهدفة من النتائج",
    en: "Search by company name and select the target company from results",
  },
  "listing.form.targeting.companySearch.empty": { ar: "لا توجد نتائج", en: "No results found" },
  "listing.form.targeting.companySearch.searching": { ar: "جاري البحث...", en: "Searching..." },
  "listing.form.targeting.companySearch.selected": { ar: "الشركة المستهدفة", en: "Target company" },
  "listing.form.targeting.categories.label": { ar: "التصنيفات المسموح بها", en: "Allowed categories" },
  "listing.form.targeting.categories.hint": {
    ar: "اختر التصنيفات التجارية التي يُسمح لها بالتقديم",
    en: "Select the business categories allowed to submit offers",
  },

  // P7 — Capabilities group labels
  "capabilities.group.collect_transport": { ar: "تجميع ونقل", en: "Collection & Transport" },
  "capabilities.group.recycle": { ar: "تدوير ومعالجة", en: "Recycling & Processing" },
  "capabilities.group.certifications": { ar: "شهادات وتصاريح", en: "Certifications & Permits" },

  // P8 — Reports subscription messaging
  "reports.subscription.badge": { ar: "ميزة مستقبلية", en: "Future Feature" },
  "reports.subscription.desc": {
    ar: "ستكون هذه التقارير التفصيلية متاحة ضمن باقات الاشتراك القادمة",
    en: "These detailed reports will be available in upcoming subscription tiers",
  },

  // P9 — Members role descriptions
  "members.role.owner.desc": {
    ar: "يدير ملف الشركة والأعضاء والإعدادات",
    en: "Manages company profile, members, and settings",
  },
  "members.role.member.desc": {
    ar: "وصول تشغيلي — لا يمكنه تعديل إعدادات الشركة أو دعوة أعضاء",
    en: "Operational access only — cannot modify company settings or invite members",
  },

  // ── Value Layer ──────────────────────────────────────────────────────────────

  // V1 — Deal value summary (financial impact of auction competition)
  "deal.value_summary.title": { ar: "القيمة المالية من المنافسة", en: "Auction Value Gained" },
  "deal.value_summary.offers_count": { ar: "عروض مستلمة", en: "offers received" },
  "deal.value_summary.first_price": { ar: "أول عرض", en: "First offer" },
  "deal.value_summary.accepted_price": { ar: "السعر المقبول", en: "Accepted price" },
  "deal.value_summary.value_gained": { ar: "القيمة الإضافية", en: "Value gained" },
  "deal.value_summary.no_change": { ar: "لم يتغير السعر منذ أول عرض", en: "Price unchanged from first offer" },
  "deal.value_summary.competition_note": { ar: "المنافسة بين المشترين رفعت السعر لصالحك", en: "Buyer competition drove the price up in your favour" },
  "deal.value_summary.sar": { ar: "ريال", en: "SAR" },

  // V2 — Governance timeline
  "deal.timeline.title": { ar: "سجل حوكمة الصفقة", en: "Deal Governance Timeline" },
  "deal.timeline.offer_accepted": { ar: "قُبل العرض", en: "Offer accepted" },
  "deal.timeline.payment_confirmed": { ar: "تأكيد الدفع", en: "Payment confirmed" },
  "deal.timeline.dispatched": { ar: "شُحنت البضاعة", en: "Goods dispatched" },
  "deal.timeline.received": { ar: "استُلمت البضاعة", en: "Goods received" },
  "deal.timeline.pending_label": { ar: "قيد الانتظار", en: "Pending" },

  // V3 — Printable deal report
  "deal.print.button": { ar: "طباعة / تحميل تقرير الصفقة", en: "Print / Download Deal Report" },
  "deal.print.footer": { ar: "تمت عبر منصة تدويرة", en: "Processed via Tadweerah platform" },
  "deal.print.title": { ar: "تقرير الصفقة", en: "Deal Report" },
  "deal.print.deal_id": { ar: "رقم الصفقة", en: "Deal ID" },
  "deal.print.producer": { ar: "المنتج", en: "Producer" },
  "deal.print.buyer": { ar: "المشتري", en: "Buyer" },
  "deal.print.material": { ar: "المادة", en: "Material" },
  "deal.print.quantity": { ar: "الكمية", en: "Quantity" },
  "deal.print.price_per_unit": { ar: "السعر لكل وحدة", en: "Price / unit" },
  "deal.print.total_value": { ar: "القيمة الإجمالية", en: "Total value" },
  "deal.print.status": { ar: "حالة الصفقة", en: "Deal status" },
  "deal.print.timeline": { ar: "الجدول الزمني", en: "Timeline" },
  "deal.print.generated_at": { ar: "تاريخ التقرير", en: "Report generated" },

  // V4 — Dashboard stats strip
  "dashboard.stats.title": { ar: "ملخص نشاطك", en: "Activity Summary" },
  "dashboard.stats.listings": { ar: "إعلانات", en: "Listings" },
  "dashboard.stats.offers_received": { ar: "عروض مستلمة", en: "Offers received" },
  "dashboard.stats.offers_made": { ar: "عروض مقدمة", en: "Offers made" },
  "dashboard.stats.completed_deals": { ar: "صفقات مكتملة", en: "Completed deals" },
  "dashboard.stats.total_value": { ar: "قيمة الصفقات (ريال)", en: "Deal value (SAR)" },

  // V5 — Smart value messages (contextual)
  "deal.smart.auction_competition": {
    ar: "لديك {count} عروض — المنافسة قد تساعدك على تحسين السعر",
    en: "You have {count} offers — competition could help improve your price",
  },
  "deal.smart.deal_documented": {
    ar: "تم توثيق الصفقة — يمكنك متابعة الخطوات التالية",
    en: "Deal is documented — you can follow the next steps",
  },
  "deal.smart.deal_completed": {
    ar: "تم إغلاق الصفقة — تمت إضافتها إلى سجل الأداء",
    en: "Deal closed — it has been added to your performance record",
  },

  // V6 — Compliance / trust signal
  "deal.compliance.badge": { ar: "صفقة موثقة عبر تدويرة", en: "Deal documented on Tadweerah" },
  "deal.compliance.tagline": { ar: "قابلة للتتبع والتوثيق", en: "Traceable and recorded" },
  "deal.compliance.ref": { ar: "مرجع:", en: "Ref:" },

  // V7 — Impact summary on reports page
  "reports.impact.title": { ar: "ملخص الأثر التشغيلي", en: "Operational Impact Summary" },
  "reports.impact.listings": { ar: "إعلانات نشرتها", en: "Listings published" },
  "reports.impact.offers_received": { ar: "عروض استلمتها", en: "Offers received" },
  "reports.impact.offers_made": { ar: "عروض قدّمتها", en: "Offers submitted" },
  "reports.impact.completed_deals": { ar: "صفقات مكتملة", en: "Completed deals" },
  "reports.impact.total_value": { ar: "إجمالي قيمة الصفقات (ريال)", en: "Total deal value (SAR)" },
  "reports.impact.disclaimer": {
    ar: "الأرقام تقديرية لأغراض المتابعة التشغيلية",
    en: "Figures are estimates for operational monitoring purposes",
  },
  "reports.impact.certified": {
    ar: "الأرقام مسجلة عبر منصة تدويرة",
    en: "Figures recorded via Tadweerah platform",
  },

  // Dashboard: empty-state onboarding CTA
  "dashboard.primary.producer": { ar: "للمنتجين", en: "For producers" },
  "dashboard.primary.buyer":    { ar: "للمشترين", en: "For buyers" },
  "dashboard.tools.title":      { ar: "أدوات المنصة", en: "Platform tools" },
  "dashboard.next.offers_received":     { ar: "لديك عروض وصلتك — راجعها الآن", en: "You have incoming offers — review them now" },
  "dashboard.next.offers_received.cta": { ar: "إعلاناتي", en: "My listings" },
  "dashboard.next.offers_made":         { ar: "عروضك المقدمة قيد المراجعة", en: "Your submitted offers are under review" },
  "dashboard.next.offers_made.cta":     { ar: "مشاركاتي", en: "My participations" },
  "dashboard.onboarding.title": {
    ar: "ابدأ رحلتك الأولى مع تدويرة",
    en: "Start your first journey with Tadweerah",
  },
  "dashboard.onboarding.desc": {
    ar: "أنشئ إعلان نفاياتك الأول — يستغرق 3 دقائق. ستصلك العروض من المشترين المعتمدين مباشرة.",
    en: "Create your first waste listing — takes 3 minutes. Verified buyers will start sending offers directly.",
  },
  "dashboard.onboarding.cta": { ar: "أنشئ إعلانك الأول", en: "Create your first listing" },

  // Company profile edit page
  "profile.title": { ar: "ملف الشركة", en: "Company Profile" },
  "profile.subtitle": { ar: "عدّل بيانات شركتك ومعلومات التواصل", en: "Edit your company data and contact information" },
  "profile.section.basic": { ar: "البيانات الأساسية", en: "Basic Information" },
  "profile.save": { ar: "حفظ التغييرات", en: "Save Changes" },
  "profile.saving": { ar: "جاري الحفظ...", en: "Saving..." },
  "profile.saved": { ar: "تم حفظ بيانات الشركة بنجاح", en: "Company profile saved successfully" },
  "profile.error.required": { ar: "مطلوب", en: "is required" },
  "profile.license.status": { ar: "حالة الترخيص", en: "License Status" },
  "profile.license.approved": { ar: "معتمد", en: "Approved" },
  "profile.license.pending": { ar: "قيد المراجعة", en: "Under Review" },
  "profile.license.rejected": { ar: "مرفوض", en: "Rejected" },
  "profile.license.expired": { ar: "منتهي الصلاحية", en: "Expired" },

  // Company profile nav card in dashboard
  "profile.nav.title": { ar: "ملف الشركة", en: "Company Profile" },
  "profile.nav.subtitle": { ar: "عدّل بيانات شركتك ومعلوماتها", en: "Update your company details and contact info" },

  // ── Contract Track ────────────────────────────────────────────────────────
  "contracts.nav": { ar: "العقود", en: "Contracts" },
  "contracts.title": { ar: "عقودي", en: "My Contracts" },
  "contracts.subtitle": { ar: "عقود التنفيذ النشطة والمكتملة", en: "Active and completed execution contracts" },
  "contracts.new": { ar: "عقد جديد", en: "New Contract" },
  "contracts.empty.title": { ar: "لا توجد عقود حتى الآن", en: "No contracts yet" },
  "contracts.empty.desc": { ar: "أنشئ عقدك الأول لبدء تتبع شحناتك", en: "Create your first contract to start tracking shipments" },
  "contracts.card.materials": { ar: "بند مواد", en: "material line" },
  "contracts.card.materials_plural": { ar: "بنود مواد", en: "material lines" },
  "contracts.card.shipments_summary": { ar: "{open} مفتوح / {total} إجمالي", en: "{open} open / {total} total" },

  "contract.status.draft": { ar: "مسودة", en: "Draft" },
  "contract.status.pending_confirmation": { ar: "بانتظار التأكيد", en: "Pending Confirmation" },
  "contract.status.active": { ar: "نشط", en: "Active" },
  "contract.status.completed": { ar: "مكتمل", en: "Completed" },
  "contract.status.cancelled": { ar: "ملغي", en: "Cancelled" },

  "contract.policy.source_weight_only": { ar: "وزن المصدر فقط", en: "Source weight only" },
  "contract.policy.destination_weight_only": { ar: "وزن الوجهة فقط", en: "Destination weight only" },
  "contract.policy.dual_source_final": { ar: "مزدوج — المصدر معتمد", en: "Dual — source is final" },
  "contract.policy.dual_destination_final": { ar: "مزدوج — الوجهة معتمدة", en: "Dual — destination is final" },
  "contract.policy.dual_higher_final": { ar: "مزدوج — الأعلى معتمد", en: "Dual — higher weight is final" },

  "contract.field.reference": { ar: "رقم العقد", en: "Contract Ref." },
  "contract.field.external_ref": { ar: "رقم مرجعي خارجي", en: "External Ref." },
  "contract.field.seller": { ar: "البائع", en: "Seller" },
  "contract.field.buyer": { ar: "المشتري", en: "Buyer" },
  "contract.field.start_date": { ar: "تاريخ البدء", en: "Start Date" },
  "contract.field.end_date": { ar: "تاريخ الانتهاء", en: "End Date" },
  "contract.field.weight_policy": { ar: "سياسة الوزن", en: "Weight Policy" },
  "contract.field.attachment": { ar: "مستند مرفق", en: "Attachment" },
  "contract.field.notes": { ar: "ملاحظات", en: "Notes" },
  "contract.field.confirmed_at": { ar: "تاريخ التأكيد", en: "Confirmed On" },

  "contract.action.submit": { ar: "إرسال للطرف الآخر للتأكيد", en: "Submit for Counterparty Confirmation" },
  "contract.action.confirm": { ar: "تأكيد العمل بالعقد", en: "Confirm Operational Use" },
  "contract.action.complete": { ar: "إغلاق العقد", en: "Complete Contract" },
  "contract.action.cancel": { ar: "إلغاء العقد", en: "Cancel Contract" },

  "contract.action.required": { ar: "مطلوب إجراء منك", en: "Action required from you" },
  "contract.action.required.desc": { ar: "يرجى مراجعة بنود العقد والضغط على «تأكيد العمل بالعقد» للمضي قدماً", en: "Review the contract terms and click 'Confirm Operational Use' to proceed" },

  "contract.action.submit.confirm": { ar: "هل أنت متأكد من إرسال العقد للطرف الآخر؟ لن تتمكن من تعديل بنود المواد بعد الإرسال.", en: "Are you sure you want to submit this contract to the counterparty? You will not be able to edit material lines after submission." },
  "contract.action.confirm.confirm": { ar: "بالتأكيد تقر بأنك توافق على تنفيذ هذا العقد عبر تدويرة. هذا ليس توقيعاً قانونياً.", en: "By confirming, you agree to manage execution of this contract on Tadweerah. This is not a legal signature." },
  "contract.action.cancel.confirm": { ar: "هل تريد إلغاء هذا العقد؟", en: "Do you want to cancel this contract?" },
  "contract.action.complete.confirm": { ar: "هل تريد إغلاق هذا العقد؟ تأكد أن جميع الشحنات في حالة نهائية.", en: "Do you want to complete this contract? Ensure all shipments are in a terminal state." },

  "contract.materials.title": { ar: "بنود المواد", en: "Material Lines" },
  "contract.materials.add": { ar: "إضافة بند", en: "Add Line" },
  "contract.materials.empty": { ar: "لا توجد بنود مواد بعد", en: "No material lines yet" },
  "contract.materials.label": { ar: "المادة", en: "Material" },
  "contract.materials.unit": { ar: "الوحدة", en: "Unit" },
  "contract.materials.price": { ar: "السعر للوحدة (ريال)", en: "Price / Unit (SAR)" },
  "contract.materials.seller_pct": { ar: "نسبة البائع %", en: "Seller %" },
  "contract.materials.buyer_pct": { ar: "نسبة المشتري %", en: "Buyer %" },
  "contract.materials.locked": { ar: "بنود المواد مقفلة بعد الإرسال", en: "Material lines are locked after submission" },

  "contract.shipments.title": { ar: "الشحنات", en: "Shipments" },
  "contract.shipments.add": { ar: "إضافة شحنة", en: "Add Shipment" },
  "contract.shipments.empty": { ar: "لا توجد شحنات بعد", en: "No shipments yet" },
  "contract.shipments.ref": { ar: "رقم الشحنة", en: "Shipment Ref." },
  "contract.shipments.material": { ar: "المادة", en: "Material" },
  "contract.shipments.source_weight": { ar: "وزن المصدر", en: "Source Weight" },
  "contract.shipments.dest_weight": { ar: "وزن الوجهة", en: "Dest. Weight" },
  "contract.shipments.final_weight": { ar: "الوزن المعتمد", en: "Final Weight" },
  "contract.shipments.final_value": { ar: "القيمة النهائية", en: "Final Value" },

  "shipment.status.planned": { ar: "مجدولة", en: "Planned" },
  "shipment.status.dispatched": { ar: "مُشحونة", en: "Dispatched" },
  "shipment.status.received": { ar: "مُستلمة", en: "Received" },
  "shipment.status.closed": { ar: "مغلقة", en: "Closed" },
  "shipment.status.cancelled": { ar: "ملغاة", en: "Cancelled" },

  "shipment.action.dispatch": { ar: "تأكيد الشحن", en: "Confirm Dispatch" },
  "shipment.action.receive": { ar: "تأكيد الاستلام", en: "Confirm Receipt" },
  "shipment.action.close": { ar: "إغلاق الشحنة", en: "Close Shipment" },
  "shipment.action.cancel": { ar: "إلغاء الشحنة", en: "Cancel Shipment" },

  "shipment.field.source_weight": { ar: "وزن المصدر (في وحدة العقد)", en: "Source weight (contract unit)" },
  "shipment.field.dest_weight": { ar: "وزن الوجهة (في وحدة العقد)", en: "Destination weight (contract unit)" },
  "shipment.field.notes": { ar: "ملاحظات الشحنة", en: "Shipment Notes" },

  "contract.timeline.title": { ar: "السجل الزمني", en: "Timeline" },
  "contract.timeline.created": { ar: "تم إنشاء العقد", en: "Contract created" },
  "contract.timeline.submitted": { ar: "تم إرساله للمشتري", en: "Submitted to buyer" },
  "contract.timeline.confirmed": { ar: "تم تأكيده من المشتري", en: "Confirmed by buyer" },
  "contract.timeline.completed": { ar: "تم إغلاق العقد", en: "Contract completed" },
  "contract.timeline.cancelled": { ar: "تم إلغاء العقد", en: "Contract cancelled" },

  "contract.new.title": { ar: "عقد تنفيذ جديد", en: "New Execution Contract" },
  "contract.new.subtitle": { ar: "حدد دورك، الطرف الآخر، نطاق المواد، وسياسة الوزن", en: "Define your role, counterparty, material scope, and weight policy" },
  "contract.new.section.details": { ar: "تفاصيل العقد", en: "Contract Details" },
  "contract.new.section.materials": { ar: "بنود المواد", en: "Material Lines" },
  "contract.new.my_role": { ar: "دوري في هذا العقد", en: "My role in this contract" },
  "contract.new.role.seller": { ar: "بائع (مورّد)", en: "Seller (Supplier)" },
  "contract.new.role.buyer": { ar: "مشتري (معالج)", en: "Buyer (Recycler)" },
  "contract.new.counterparty_seller": { ar: "شركة البائع (الطرف الآخر)", en: "Seller Company (Counterparty)" },
  "contract.new.counterparty_buyer": { ar: "شركة المشتري (الطرف الآخر)", en: "Buyer Company (Counterparty)" },
  "contract.new.search_seller": { ar: "ابحث عن الشركة البائعة...", en: "Search for seller company..." },
  "contract.new.search_buyer": { ar: "ابحث عن الشركة المشترية...", en: "Search for buyer company..." },
  "contract.new.buyer_search": { ar: "ابحث عن الشركة المشترية...", en: "Search for buyer company..." },
  "contract.new.buyer_selected": { ar: "الشركة المشترية", en: "Buyer Company" },
  "contract.new.submit": { ar: "إنشاء العقد", en: "Create Contract" },
  "contract.new.add_material": { ar: "إضافة بند مادة", en: "Add Material Line" },
  "contract.new.min_one_material": { ar: "أضف بنداً واحداً على الأقل قبل الإنشاء", en: "Add at least one material line before creating" },
  "contract.new.creating": { ar: "جارٍ الإنشاء...", en: "Creating..." },

  "contract.attachment.hint": { ar: "رابط اختياري لوثيقة داعمة (PDF، صورة، إلخ). لا يُعدّ توقيعاً قانونياً.", en: "Optional link to a supporting document (PDF, image, etc.). Not a legal signature." },

  "contract.role.you_are_seller": { ar: "أنت البائع في هذا العقد", en: "You are the seller in this contract" },
  "contract.role.you_are_buyer": { ar: "أنت المشتري في هذا العقد", en: "You are the buyer in this contract" },
  "contract.role.you_are_creator": { ar: "أنت منشئ هذا العقد", en: "You created this contract" },
  "contract.role.you_are_counterparty": { ar: "أنت الطرف المُستلِم لهذا العقد", en: "You are the receiving counterparty" },

  "contract.summary.total_shipments": { ar: "إجمالي الشحنات", en: "Total Shipments" },
  "contract.summary.open_shipments": { ar: "شحنات مفتوحة", en: "Open Shipments" },
  "contract.summary.closed_shipments": { ar: "شحنات مغلقة", en: "Closed Shipments" },
  "contract.summary.cancelled_shipments": { ar: "شحنات ملغاة", en: "Cancelled" },

  // ── Company Roles (MWAN terminology — stored values match MWAN) ─────────────
  "role.generator": { ar: "مولّد نفايات (Generator)", en: "Waste Generator" },
  "role.receiver": { ar: "مستلِم نفايات (Receiver)", en: "Waste Receiver" },
  "role.transporter": { ar: "ناقل مرخّص (Transporter)", en: "Licensed Transporter" },
  "onboarding.form.roles": { ar: "دور الشركة في منظومة النفايات", en: "Company Role in Waste System" },
  "onboarding.form.roles.hint": { ar: "يمكنك اختيار أكثر من دور. يُستخدم لتصنيف الشركة وفق متطلبات مَوَن.", en: "Select all that apply. Used to classify your company per MWAN requirements." },
  "onboarding.form.roles.generator.desc": { ar: "تنتج أو تخزّن نفايات صناعية أو تجارية", en: "Generates or holds industrial/commercial waste" },
  "onboarding.form.roles.receiver.desc": { ar: "تستلم النفايات لإعادة التدوير أو المعالجة", en: "Receives waste for recycling or treatment" },
  "onboarding.form.roles.transporter.desc": { ar: "تنقل النفايات بين الجهات المرخّصة", en: "Transports waste between licensed facilities" },

  // ── Dashboard — Transporter section ───────────────────────────────────────
  "dashboard.carrier.title": { ar: "طلبات النقل", en: "Transport Requests" },
  "dashboard.carrier.desc": { ar: "عرض وقبول طلبات نقل النفايات المتاحة", en: "Browse and accept available waste transport jobs" },
  "dashboard.carrier.available_cta": { ar: "تصفح الطلبات المتاحة", en: "Browse Available Jobs" },

  // ── Transport Requests Page ────────────────────────────────────────────────
  "transport.title": { ar: "طلبات النقل", en: "Transport Requests" },
  "transport.subtitle": { ar: "تتبّع طلبات نقل النفايات لصفقاتك وتلك المتاحة للقبول", en: "Track transport requests for your deals and those available to accept" },
  "transport.tab.mine": { ar: "طلباتي", en: "My Requests" },
  "transport.tab.available": { ar: "متاحة للقبول", en: "Available" },
  "transport.empty.mine": { ar: "لا توجد طلبات نقل مرتبطة بك", en: "No transport requests found" },
  "transport.empty.available": { ar: "لا توجد طلبات نقل متاحة حالياً", en: "No available transport requests right now" },
  "transport.status.pending": { ar: "بانتظار ناقل", en: "Awaiting Carrier" },
  "transport.status.accepted": { ar: "تم قبول الناقل", en: "Carrier Accepted" },
  "transport.status.manifest_ready": { ar: "جاهز للبيان", en: "Manifest Ready" },
  "transport.status.in_transit": { ar: "في الطريق", en: "In Transit" },
  "transport.status.delivered": { ar: "تم التسليم", en: "Delivered" },
  "transport.status.closed": { ar: "مغلق", en: "Closed" },
  "transport.status.cancelled": { ar: "ملغى", en: "Cancelled" },
  "transport.action.accept": { ar: "قبول الطلب", en: "Accept Request" },
  "transport.action.accepting": { ar: "جارٍ القبول...", en: "Accepting..." },
  "transport.deal_ref": { ar: "صفقة", en: "Deal" },
  "transport.pickup_city": { ar: "مدينة الاستلام", en: "Pickup City" },
  "transport.delivery_city": { ar: "مدينة التسليم", en: "Delivery City" },
  "transport.planned_pickup": { ar: "موعد الاستلام المخطط", en: "Planned Pickup" },
  "transport.transporter": { ar: "الناقل", en: "Transporter" },
  "transport.not_assigned": { ar: "لم يُحدَّد بعد", en: "Not assigned yet" },

  // ── MWAN Summary Panel ─────────────────────────────────────────────────────
  "mwan.title": { ar: "ملخص مَوَن (eManifest)", en: "MWAN eManifest Summary" },
  "mwan.subtitle": { ar: "جاهزية بيانات البيان الإلكتروني", en: "Electronic manifest data readiness" },
  "mwan.readiness_score": { ar: "نسبة الاكتمال", en: "Readiness Score" },
  "mwan.ready": { ar: "جاهز للبيان", en: "Ready for Manifest" },
  "mwan.not_ready": { ar: "غير مكتمل", en: "Incomplete" },
  "mwan.section.generator": { ar: "المولّد (منتج النفايات)", en: "Generator (Waste Producer)" },
  "mwan.section.receiver": { ar: "المستلِم", en: "Receiver" },
  "mwan.section.transporter": { ar: "الناقل", en: "Transporter" },
  "mwan.section.waste": { ar: "وصف النفايات", en: "Waste Description" },
  "mwan.section.transport": { ar: "بيانات النقل", en: "Transport Details" },
  "mwan.check.cr": { ar: "السجل التجاري", en: "Commercial Registration" },
  "mwan.check.license": { ar: "رقم الترخيص", en: "License Number" },
  "mwan.check.city": { ar: "المدينة", en: "City" },
  "mwan.check.waste_defined": { ar: "النفاية محددة", en: "Waste defined" },
  "mwan.check.quantity_confirmed": { ar: "الكمية مؤكدة", en: "Quantity confirmed" },
  "mwan.check.quantity_confirmed_hint": { ar: "يُؤكَّد بعد الاستلام وقراءة الوزن", en: "Confirmed after pickup / weighbridge reading" },
  "mwan.check.payment_confirmed": { ar: "الدفع مؤكد", en: "Payment confirmed" },
  "mwan.check.payment_confirmed_hint": { ar: "مطلوب قبل الإغلاق النهائي", en: "Required before final closure" },
  "mwan.check.transport_created": { ar: "طلب النقل منشأ", en: "Transport request created" },
  "mwan.check.transporter_assigned": { ar: "الناقل مُعيَّن", en: "Transporter assigned" },
  "mwan.check.pickup_city": { ar: "مدينة الاستلام محددة", en: "Pickup city set" },
  "mwan.check.delivery_city": { ar: "مدينة التسليم محددة", en: "Delivery city set" },
  "mwan.check.waste_description": { ar: "وصف النفاية مكتمل", en: "Waste description complete" },
  "mwan.create_transport": { ar: "إنشاء طلب نقل", en: "Create Transport Request" },
  "mwan.view_transport": { ar: "عرض طلب النقل", en: "View Transport Request" },
  "mwan.loading": { ar: "جارٍ تحميل بيانات مَوَن...", en: "Loading MWAN data..." },
  "mwan.error": { ar: "تعذّر تحميل ملخص مَوَن", en: "Could not load MWAN summary" },
  "transport.create.title": { ar: "إنشاء طلب نقل", en: "Create Transport Request" },
  "transport.create.pickup_city": { ar: "مدينة الاستلام", en: "Pickup City" },
  "transport.create.delivery_city": { ar: "مدينة التسليم", en: "Delivery City" },
  "transport.create.waste_desc": { ar: "وصف النفاية", en: "Waste Description" },
  "transport.create.submit": { ar: "إرسال طلب النقل", en: "Submit Transport Request" },
  "transport.create.success": { ar: "تم إنشاء طلب النقل بنجاح ✓", en: "Transport request created ✓" },
  "transport.create.prefilled": { ar: "مملوء تلقائياً من بيانات الصفقة — يمكنك تعديله", en: "Auto-filled from deal data — you can edit" },
  "onboarding.mwan.cr_hint": { ar: "مطلوب في البيان الإلكتروني مَوَن — أضفه الآن لتسريع إصدار البيان لاحقاً", en: "Required for MWAN eManifest — add it now to speed up manifest generation later" },
  "profile.missing_compliance": { ar: "بيانات الامتثال ناقصة: أضف السجل التجاري ورقم الترخيص لإتمام متطلبات مَوَن.", en: "Compliance data incomplete: add CR and license number to meet MWAN eManifest requirements." },
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
