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
  "deal.settlement.label": { ar: "نوع التسوية", en: "Settlement Type" },
  "deal.field.price_per_unit": { ar: "السعر لكل وحدة", en: "Price per unit" },
  "deal.field.estimated_amount": { ar: "المبلغ التقديري *", en: "Estimated amount *" },
  "deal.field.actual_quantity": { ar: "الكمية الفعلية", en: "Actual quantity" },
  "deal.field.final_amount": { ar: "المبلغ النهائي", en: "Final amount" },
  "deal.field.quantity.placeholder": { ar: "أدخل الكمية الفعلية", en: "Enter actual quantity" },

  "deal.action.confirm_payment": { ar: "تأكيد استلام الدفع", en: "Confirm Payment Received" },
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
  "deal.confirm.payment.title": { ar: "تأكيد استلام الدفع", en: "Confirm Payment Received" },
  "deal.confirm.payment.desc": { ar: "هل تأكدت من استلام الدفع من المشتري؟ لا يمكن التراجع عن هذه الخطوة.", en: "Have you received payment from the buyer? This step cannot be undone." },
  "deal.confirm.dispatch.title": { ar: "تأكيد إرسال البضاعة", en: "Confirm Dispatch" },
  "deal.confirm.dispatch.desc": { ar: "هل تأكدت من إرسال البضاعة للمشتري؟ لا يمكن التراجع عن هذه الخطوة.", en: "Have you dispatched the goods to the buyer? This step cannot be undone." },
  "deal.confirm.receipt.title": { ar: "تأكيد استلام البضاعة", en: "Confirm Receipt" },
  "deal.confirm.receipt.desc": { ar: "هل تأكدت من استلام البضاعة من المنتج؟ لا يمكن التراجع عن هذه الخطوة.", en: "Have you received the goods from the producer? This step cannot be undone." },
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
