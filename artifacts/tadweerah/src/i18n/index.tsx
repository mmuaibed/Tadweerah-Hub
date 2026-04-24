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
  "onboarding.form.actions.other_desc": { ar: "وصف النشاط الآخر", en: "Describe the other activity" },
  "onboarding.form.actions.other_required": { ar: "الرجاء وصف النشاط الآخر", en: "Please describe the other activity" },
  "onboarding.form.actions.other_placeholder": { ar: "صف ما تقوم به شركتك...", en: "Describe what your company does..." },
  "onboarding.form.license_section": { ar: "معلومات الترخيص", en: "License Information" },
  "onboarding.form.license_section.hint": { ar: "بعض الأنشطة المختارة تستلزم ترخيصًا. يُرجى تزويدنا بمعلوماته.", en: "Some selected activities require a license. Please provide your license details." },
  "onboarding.form.license.required_badge": { ar: "يتطلب ترخيصًا", en: "License required" },
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
    ar: "اعرض نفاياتك ليطّلع عليها المشترون",
    en: "Make your waste available for buyers to discover",
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
  "listing.form.image": { ar: "صورة العرض (اختياري)", en: "Listing Image (Optional)" },
  "listing.form.image.prompt": { ar: "انقر لرفع صورة", en: "Click to upload an image" },
  "listing.form.image.hint": { ar: "JPG أو PNG · حتى 5 ميجابايت", en: "JPG or PNG · up to 5 MB" },
  "listing.form.submit": { ar: "نشر العرض", en: "Publish Listing" },
  "listing.form.saving": { ar: "جاري النشر...", en: "Publishing..." },
  "listing.form.uploading": { ar: "جاري رفع الصورة...", en: "Uploading image..." },
  "listing.form.error": { ar: "تعذر نشر العرض. تأكد من البيانات وحاول مرة أخرى.", en: "Could not publish the listing. Check your inputs and try again." },
  "listing.form.error.license_invalid": { ar: "لا يمكن نشر عرض جديد. الترخيص الحالي لشركتك غير صالح. تواصل مع الدعم.", en: "Cannot post a new listing. Your company's license has been rejected or expired. Please contact support." },

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

  // M4 — Offers / Bidding
  "offer.summary.noOffers": { ar: "لا توجد عروض بعد", en: "No offers yet" },
  "offer.summary.count": { ar: "عروض واردة", en: "offers received" },
  "offer.summary.highest": { ar: "أعلى عرض", en: "Highest offer" },
  "offer.summary.perUnit": { ar: "ر.س/وحدة", en: "SAR/unit" },

  "offer.form.price": { ar: "سعرك لكل وحدة (ر.س)", en: "Your price per unit (SAR)" },
  "offer.form.message": { ar: "ملاحظة للمنتج (اختياري)", en: "Note to producer (optional)" },
  "offer.form.submit": { ar: "إرسال العرض", en: "Submit Offer" },
  "offer.form.submitting": { ar: "جاري الإرسال...", en: "Submitting..." },
  "offer.form.improve": { ar: "تحسين عرضي", en: "Improve My Offer" },
  "offer.form.improving": { ar: "جاري التحسين...", en: "Improving..." },
  "offer.form.newPrice": { ar: "السعر الجديد (ر.س/وحدة)", en: "New price (SAR/unit)" },
  "offer.form.mustExceed": { ar: "يجب أن يتجاوز أعلى عرض حالي", en: "Must exceed the current highest offer" },

  "offer.mine.title": { ar: "عرضي الحالي", en: "My Current Offer" },
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

  "deal.status.active": { ar: "نشطة", en: "Active" },
  "deal.status.payment_confirmed": { ar: "تم تأكيد الدفع", en: "Payment Confirmed" },
  "deal.status.dispatched": { ar: "تم الإرسال", en: "Dispatched" },
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

  "deal.action.confirm_payment": { ar: "تأكيد استلام الدفع", en: "Confirm Receipt of Payment" },
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
  "deal.waiting.active": { ar: "بانتظار المنتج لتأكيد استلام الدفع", en: "Waiting for producer to confirm payment" },
  "deal.waiting.payment_confirmed": { ar: "بانتظار المنتج لتأكيد إرسال البضاعة", en: "Waiting for producer to confirm dispatch" },
  "deal.waiting.dispatched": { ar: "بانتظار المشتري لتأكيد استلام البضاعة", en: "Waiting for buyer to confirm receipt" },

  // Confirmation dialogs
  "deal.confirm.payment.title": { ar: "تأكيد استلام الدفع", en: "Confirm Receipt of Payment" },
  "deal.confirm.payment.desc": { ar: "هل تأكدت من استلام الدفع من المشتري؟ لا يمكن التراجع عن هذه الخطوة.", en: "Have you received payment from the buyer? This step cannot be undone." },
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
  "terms.lastUpdated": { ar: "آخر تحديث: أبريل 2026 — نسخة أولية للمراجعة", en: "Last updated: April 2026 — Draft for review" },
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
