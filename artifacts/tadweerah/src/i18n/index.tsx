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
    ar: "منصة سعودية لتوثيق وإدارة تدفق المواد القابلة للتدوير",
    en: "Saudi platform for documenting and managing recyclable material flows",
  },
  "home.headline": {
    ar: "من المصدر إلى المعالجة — مسار موثّق للمواد القابلة للتدوير",
    en: "From source to processing — a documented pathway for recyclable materials",
  },
  "home.subheadline": {
    ar: "كل قيمة تستحق أن تعود",
    en: "Every Value Deserves a Second Life",
  },
  "home.description": {
    ar: "تدويرة — منصة B2B لتوثيق تدفق المواد القابلة للتدوير من المصدر إلى المعالجة وما بعدها",
    en: "Tadweerah — a B2B platform for documenting recyclable material flows from source to processing and beyond",
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
    ar: "منصة موحّدة ومحوكمة لإدارة تدفق المواد القابلة للتدوير",
    en: "A unified, governed platform for managing recyclable material flows",
  },
  "home.why.p2": {
    ar: "كل عملية موثّقة وقابلة للتتبع بالكامل",
    en: "Every operation documented and fully traceable",
  },
  "home.why.p3": {
    ar: "تقارير تدعم الامتثال، الاستدامة، ومسؤولية المنتج",
    en: "Reports that support compliance, sustainability, and producer responsibility",
  },
  "home.why.p4": {
    ar: "لوحة تحكم وبيانات تساعد جميع الأطراف على قرارات أفضل",
    en: "Dashboards and data that help all parties make better decisions",
  },
  "home.why.p5": {
    ar: "حماية وخصوصية عالية لبيانات منشأتك",
    en: "Strong protection and privacy for your company data",
  },
  "home.why.p6": {
    ar: "وصول أسهل إلى شبكة أوسع من المنتجين والمعالجين والناقلين بضغطة زر",
    en: "Easier access to a wider network of producers, processors, and carriers",
  },

  "home.for.title": { ar: "لمن هذه المنصة؟", en: "Who Is This For?" },
  "home.for.producers.value": {
    ar: "حوّل مخلفاتك القابلة للتدوير إلى قيمة موثّقة تدعم الامتثال والاستدامة",
    en: "Turn your recyclable materials into documented value that supports compliance and sustainability",
  },
  "home.for.buyers.value": {
    ar: "أمّن مدخلات موثوقة لتغذية عملياتك وفتح فرص أوسع للقيمة الدائرية",
    en: "Secure trusted inputs for your operations and unlock wider circular-value opportunities",
  },
  "home.for.transporters.value": {
    ar: "انضم إلى منظومة شحن موثّقة بين المنتجين والمعالجين المرخّصين",
    en: "Join a documented transport network between producers and licensed processors",
  },
  "nav.language": { ar: "English", en: "العربية" },
  "action.signin": { ar: "تسجيل الدخول", en: "Sign In" },
  "action.signup": { ar: "إنشاء حساب", en: "Sign Up" },

  "signin.welcome": { ar: "مرحباً بعودتك 👋", en: "Welcome back 👋" },
  "signin.subtitle": { ar: "حياك الله من جديد في منصة تدويرة\nأدخل بياناتك للمتابعة", en: "Welcome back to Tadweerah\nEnter your details to continue" },
  "signin.email": { ar: "البريد الإلكتروني", en: "Email address" },
  "signin.password": { ar: "كلمة المرور", en: "Password" },
  "signin.error.generic": { ar: "حدث خطأ، يرجى المحاولة مجدداً", en: "Something went wrong. Please try again." },
  "signin.error.incomplete": { ar: "لم يكتمل تسجيل الدخول، يرجى المحاولة مجدداً", en: "Sign-in was not completed. Please try again." },
  "signin.no_account": { ar: "ليس لديك حساب؟", en: "Don't have an account?" },
  "signin.create_company": { ar: "سجّل شركتك", en: "Register your company" },
  "signin.forgot_password": { ar: "نسيت كلمة المرور؟", en: "Forgot password?" },
  "signin.back_to_login": { ar: "العودة لتسجيل الدخول", en: "Back to sign in" },
  "signin.forgot.subtitle": { ar: "أدخل بريدك الإلكتروني وسنرسل لك رمز إعادة التعيين", en: "Enter your email and we'll send you a reset code" },
  "signin.forgot.send_code": { ar: "إرسال رمز التعيين", en: "Send reset code" },
  "signin.reset.title": { ar: "تعيين كلمة مرور جديدة", en: "Set new password" },
  "signin.reset.subtitle": { ar: "أدخل الرمز الذي وصلك ثم كلمة المرور الجديدة", en: "Enter the code you received and your new password" },
  "signin.reset.new_password": { ar: "كلمة المرور الجديدة", en: "New password" },
  "signin.reset.submit": { ar: "تأكيد كلمة المرور الجديدة", en: "Confirm new password" },
  "signin.reset.success": { ar: "تم تغيير كلمة المرور بنجاح، جارٍ تسجيل الدخول...", en: "Password changed successfully. Signing in..." },

  "license.issuer.mwan": { ar: "موان", en: "MWAN" },
  "license.issuer.municipality": { ar: "بلدية", en: "Municipality" },
  "license.issuer.other": { ar: "جهة أخرى", en: "Other Authority" },
  "license.number": { ar: "رقم الرخصة / الترخيص", en: "License Number" },
  "license.issuer": { ar: "الجهة المصدرة", en: "Issuing Authority" },
  "license.expiry": { ar: "تاريخ الانتهاء (اختياري)", en: "Expiry Date (optional)" },
  "license.expiry.expired": { ar: "تاريخ انتهاء الترخيص منتهٍ — يرجى إدخال تاريخ صالح أو تركه فارغاً للمراجعة", en: "License expiry date has passed — enter a valid future date or leave blank for review" },
  "license.linked_activities": { ar: "الأنشطة المرتبطة بهذه الرخصة", en: "Activities covered by this license" },
  "license.add": { ar: "إضافة رخصة أخرى", en: "Add Another License" },
  "license.remove": { ar: "حذف", en: "Remove" },
  "license.hint": { ar: "أدخل رقم ترخيص موان أو الجهة المختصة إن وجد، وسيتم مراجعته من فريقنا.", en: "Enter your MWAN or relevant authority license number if available. Our team will review it." },
  "license.multi_hint": { ar: "إذا كانت رخصة واحدة تغطي أكثر من نشاط، اختر نفس الرخصة واربطها بالأنشطة المناسبة. وإذا كان لكل نشاط رخصة مستقلة، أضف كل رخصة على حدة.", en: "If one license covers multiple activities, link it to all relevant activities. If each activity has a separate license, add each one separately." },
  "license.single_label": { ar: "رخصة واحدة", en: "Single license" },
  "license.multi_label": { ar: "أكثر من رخصة", en: "Multiple licenses" },
  "license.has_multi": { ar: "هل لديك أكثر من رخصة؟", en: "Do you have more than one license?" },

  "onboarding.step.company": { ar: "بيانات الشركة", en: "Company Details" },
  "onboarding.step.account": { ar: "إنشاء حساب", en: "Create Account" },
  "onboarding.step.verify": { ar: "التحقق من البريد", en: "Verify Email" },
  "onboarding.step.basic_info": { ar: "البيانات الأساسية", en: "Basic Info" },
  "onboarding.step.activity": { ar: "النشاط والأدوار", en: "Activity & Roles" },
  "onboarding.step.licenses_step": { ar: "التراخيص", en: "Licenses" },
  "onboarding.step.confirm": { ar: "الموافقة", en: "Confirm" },
  "onboarding.nav.next": { ar: "التالي", en: "Next" },
  "onboarding.nav.back": { ar: "السابق", en: "Back" },
  "onboarding.nav.next_account": { ar: "التالي: إنشاء الحساب", en: "Next: Create Account" },
  "onboarding.company.next": { ar: "التالي: إنشاء حساب", en: "Next: Create Account" },
  "onboarding.account.title": { ar: "بيانات حساب الشركة", en: "Company Account" },
  "onboarding.account.subtitle": { ar: "أنشئ حساباً لتفعيل اشتراك شركتك", en: "Create an account to activate your company subscription" },
  "onboarding.account.email": { ar: "البريد الإلكتروني للحساب", en: "Account email address" },
  "onboarding.account.password": { ar: "كلمة المرور", en: "Password" },
  "onboarding.account.password.hint": { ar: "8 أحرف على الأقل", en: "At least 8 characters" },
  "onboarding.account.submit": { ar: "إنشاء الحساب وتسجيل الشركة", en: "Create Account & Register Company" },
  "onboarding.account.back": { ar: "العودة لبيانات الشركة", en: "Back to Company Details" },
  "onboarding.verify.title": { ar: "تحقق من البريد الإلكتروني", en: "Verify Your Email" },
  "onboarding.verify.subtitle": { ar: "تم إرسال رمز التحقق إلى بريدك الإلكتروني", en: "A verification code was sent to your email" },
  "onboarding.verify.code": { ar: "رمز التحقق", en: "Verification Code" },
  "onboarding.verify.submit": { ar: "تحقق وأكمل التسجيل", en: "Verify & Complete Registration" },
  "onboarding.verify.back": { ar: "العودة", en: "Back" },
  "onboarding.verify.resend": { ar: "إعادة إرسال الرمز", en: "Resend Code" },
  "onboarding.verify.resend.sent": { ar: "تم إعادة الإرسال", en: "Code resent" },
  "action.signout": { ar: "تسجيل الخروج", en: "Sign Out" },
  "action.getstarted": { ar: "ابدأ الآن", en: "Get Started" },
  "action.register_company": { ar: "سجّل شركتك مجاناً", en: "Register Your Company — Free" },
  "home.no_account_prompt": { ar: "ليس لديك حساب؟ أنشئ حساب شركتك الآن", en: "No account? Create your company account now" },
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
  "home.feature2.title": { ar: "للمعالجين والمصانع", en: "For Processors and Factories" },
  "home.feature2.desc": {
    ar: "تصفح آلاف الفرص لشراء مواد قابلة للتدوير",
    en: "Browse thousands of opportunities to buy recyclable materials",
  },
  "home.feature3.title": { ar: "للناقلين المرخّصين", en: "For Licensed Carriers" },
  "home.feature3.desc": {
    ar: "قدم عروض نقل واكسب رحلات جديدة بسهولة",
    en: "Submit transport bids and win new trips easily",
  },

  "onboarding.title": { ar: "أنشئ ملف شركتك", en: "Create your company profile" },
  "onboarding.subtitle": {
    ar: "أكمل بياناتك للبدء باستخدام تدويرة",
    en: "Complete your details to start using Tadweerah",
  },
  "onboarding.form.basic_info_title": { ar: "المعلومات الأساسية", en: "Basic Information" },
  "onboarding.form.name": { ar: "اسم الشركة", en: "Company Name" },
  "onboarding.form.city": { ar: "المدينة", en: "City" },
  "onboarding.form.cr": { ar: "رقم السجل التجاري", en: "Commercial Registration" },
  "onboarding.form.cr.hint": { ar: "هذا الحقل إلزامي — المنصة مخصصة للمنشآت (شركات / مؤسسات) فقط", en: "This field is mandatory — the platform is for businesses and organizations only" },
  "onboarding.form.cr.required": { ar: "رقم السجل التجاري مطلوب", en: "Commercial Registration number is required" },
  "onboarding.form.phone": { ar: "رقم الجوال", en: "Mobile Number" },
  "onboarding.form.b2b_notice": { ar: "التسجيل مخصص للشركات والمؤسسات فقط", en: "Registration is for businesses and organizations only" },
  "onboarding.form.category": { ar: "تصنيف الشركة (اختياري)", en: "Company Category (Optional)" },
  "onboarding.form.category.placeholder": { ar: "اختر تصنيفاً", en: "Select a category" },
  "onboarding.form.actions": { ar: "ماذا تعمل شركتك؟", en: "What does your company do?" },
  "onboarding.form.actions.hint": { ar: "اختر كل ما ينطبق (مطلوب واحد على الأقل)", en: "Select all that apply (at least one required)" },
  "onboarding.form.actions.required": { ar: "الرجاء تحديد نشاط واحد على الأقل", en: "Please select at least one activity" },
  "onboarding.form.actions.loading": { ar: "جاري التحميل...", en: "Loading..." },
  "onboarding.form.actions.error": { ar: "تعذّر تحميل الأنشطة", en: "Failed to load activities" },
  "onboarding.form.actions.empty": { ar: "لا توجد أنشطة متاحة", en: "No activities available" },
  "common.retry": { ar: "إعادة المحاولة", en: "Retry" },
  "common.back": { ar: "العودة للصفحة السابقة", en: "Go Back" },
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
  "listing.new.title": { ar: "إضافة إعلان نفايات", en: "Add Waste Listing" },
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
  "listing.form.material_location_address": { ar: "العنوان الوطني / كود الموقع", en: "National Address / Location Code" },
  "listing.form.material_location_address.placeholder": { ar: "مثال: FMD-DMM-IND-TEST-001 أو كود موقع المنشأة", en: "Example: FMD-DMM-IND-TEST-001 or facility site code" },
  "listing.form.material_location_notes": { ar: "تفاصيل الموقع (اختياري)", en: "Site Details (Optional)" },
  "listing.form.material_location_notes.placeholder": { ar: "مثال: [اختبار] المدينة الصناعية الثانية - بوابة 3 - لا يمثل عنواناً فعلياً", en: "Example: [TEST] Second Industrial City - Gate 3 - not a real address" },
  "listing.form.google_maps_url": { ar: "رابط Google Maps (اختياري — استخدم رابط موقع المنشأة فقط، ولا تستخدم عنواناً شخصياً)", en: "Google Maps URL (Optional — use the facility location only, not a personal address)" },
  "listing.form.google_maps_url.placeholder": { ar: "https://maps.google.com/...", en: "https://maps.google.com/..." },
  "listing.form.google_maps_url.invalid": { ar: "الرابط غير صالح — يجب أن يبدأ بـ https://", en: "Invalid URL — must start with https://" },
  "listing.location.address": { ar: "العنوان الوطني / كود الموقع", en: "National Address / Location Code" },
  "listing.location.site_details": { ar: "تفاصيل الموقع", en: "Site Details" },
  "listing.location.open_maps": { ar: "فتح الموقع على Google Maps", en: "Open in Google Maps" },
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
  "listing.form.submit": { ar: "نشر الإعلان", en: "Publish Listing" },
  "listing.form.saving": { ar: "جاري النشر...", en: "Publishing..." },
  "listing.form.uploading": { ar: "جاري رفع الصورة...", en: "Uploading image..." },
  "listing.form.error": { ar: "تعذر نشر الإعلان. تأكد من البيانات وحاول مرة أخرى.", en: "Could not publish the listing. Check your inputs and try again." },
  "listing.form.error.license_invalid": { ar: "لا يمكن نشر إعلان جديد. الترخيص الحالي لشركتك غير صالح. تواصل مع الدعم.", en: "Cannot post a new listing. Your company's license has been rejected or expired. Please contact support." },
  "listing.form.error.revenue_share_pct_required": { ar: "أدخل نسبة تشارك الإيرادات (1–100) لإتمام النشر.", en: "Enter a revenue share percentage (1–100) to publish the listing." },

  // Producer — my listings
  "myListings.title": { ar: "إعلاناتي", en: "My Listings" },
  "myListings.subtitle": { ar: "جميع إعلانات النفايات التي نشرتها", en: "All the waste listings you've published" },
  "myListings.empty.title": { ar: "لا توجد إعلانات حالياً", en: "No listings yet" },
  "myListings.empty.desc": { ar: "ابدأ بإضافة أول إعلان نفايات لك.", en: "Start by adding your first waste listing." },
  "myListings.add": { ar: "إضافة إعلان", en: "Add Listing" },
  "myListings.close": { ar: "إغلاق الإعلان", en: "Close Listing" },
  "myListings.closing": { ar: "جاري الإغلاق...", en: "Closing..." },
  "myListings.closeError": { ar: "تعذر إغلاق الإعلان. حاول مرة أخرى.", en: "Could not close the listing. Try again." },

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
  "offer.form.mustExceed.fixed": { ar: "يجب أن يكون إجمالي عرضك الجديد أعلى من العرض الإجمالي الحالي", en: "Your new total offer must be higher than the current total offer" },

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
  "offer.price.offerTotal": { ar: "إجمالي العرض", en: "Offer Total" },
  "offer.price.perUnit": { ar: "ر.س / وحدة", en: "SAR / unit" },

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

  "deal.status.active": { ar: "بانتظار تأكيد الدفع (حوالة بنكية)", en: "Awaiting Payment (Bank Transfer)" },
  "deal.status.payment_confirmed": { ar: "تم تأكيد الدفع (الحوالة المستلمة)", en: "Payment Confirmed (Transfer Received)" },
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

  "deal.action.confirm_payment": { ar: "تأكيد استلام الدفع (حوالة بنكية)", en: "Confirm Payment Receipt (Bank Transfer)" },
  "deal.action.confirm_dispatch": { ar: "تأكيد إرسال البضاعة", en: "Confirm Dispatch" },
  "deal.action.confirm_receipt": { ar: "تأكيد استلام البضاعة في الموقع", en: "Confirm Site Receipt" },

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
  "listing.form.buyerEligibility": { ar: "أهلية المشترين / ظهور الإعلان", en: "Buyer eligibility / listing visibility" },
  "listing.form.buyerEligibility.hint": {
    ar: "حدد من يمكنه رؤية هذا الإعلان والتقديم عليه.",
    en: "Specify who can view and submit offers on this listing.",
  },
  "listing.buyerEligibility.open_to_all.label": { ar: "متاحة لجميع الشركات المؤهلة", en: "Open to all qualified companies" },
  "listing.buyerEligibility.open_to_all.desc": {
    ar: "أي شركة مسجلة ومؤهلة يمكنها التقديم — يزيد من المنافسة والسيولة.",
    en: "Any registered and qualified company can submit an offer — maximises competition and liquidity.",
  },
  "listing.buyerEligibility.recycling_only.label": { ar: "مخصصة لشركات إعادة التدوير فقط", en: "Recycling companies only" },
  "listing.buyerEligibility.recycling_only.desc": {
    ar: "فقط الشركات الحاملة لترخيص إدارة النفايات المعتمد — يضمن الامتثال التنظيمي.",
    en: "Only companies with an approved waste management licence — ensures regulatory compliance.",
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
  "report.modal.min_length":         { ar: "يجب أن يكون الوصف 5 أحرف على الأقل", en: "Description must be at least 5 characters" },
  "report.modal.message_label":      { ar: "الرسالة", en: "Message" },
  "report.modal.subject":            { ar: "الموضوع (اختياري)", en: "Subject (optional)" },
  "report.modal.subject_placeholder":{ ar: "موضوع المشكلة...", en: "Issue subject..." },
  "report.modal.phone":              { ar: "رقم التواصل (اختياري)", en: "Contact number (optional)" },
  "report.modal.phone_placeholder":  { ar: "05XXXXXXXX", en: "05XXXXXXXX" },

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
  "deal.role.your_turn": { ar: "مطلوب منك", en: "Required from you" },
  "deal.role.not_your_turn": { ar: "بانتظار الطرف الآخر", en: "Awaiting other party" },
  "deal.role.processing": { ar: "فريق تدويرة يتابع", en: "Tadweerah team is following up" },

  // Deal stage labels for participations page (buyer perspective)
  "participations.deal.active": { ar: "بانتظار تأكيد الدفع", en: "Awaiting payment confirmation" },
  "participations.deal.payment_confirmed": { ar: "بانتظار الشحن", en: "Awaiting dispatch" },
  "participations.deal.dispatched": { ar: "بانتظار تأكيد الاستلام", en: "Awaiting receipt confirmation" },
  "participations.deal.completed": { ar: "مكتملة ✓", en: "Completed ✓" },
  "participations.deal.receipt_pending": { ar: "بانتظار تأكيد الاستلام", en: "Pending receipt confirmation" },

  // Waiting-for status — who acts next
  "deal.waiting.active": { ar: "بانتظار المشتري لإرسال مرجع الدفع", en: "Waiting for buyer to submit payment reference" },
  "deal.waiting.payment_submitted": { ar: "بانتظار المنتج لتأكيد استلام الدفع", en: "Waiting for producer to confirm payment receipt" },
  "deal.waiting.payment_confirmed": { ar: "بانتظار المنتج لتأكيد إرسال البضاعة", en: "Waiting for producer to confirm dispatch" },
  "deal.waiting.dispatched": { ar: "بانتظار المشتري لتأكيد استلام البضاعة", en: "Waiting for buyer to confirm receipt" },
  "deal.waiting.receipt_pending.producer": { ar: "بانتظار مراجعة الإدارة وتأكيد الاستلام — يرجى التواصل مع الدعم إذا لزم الأمر", en: "Awaiting admin review and receipt confirmation — contact support if needed." },
  "deal.waiting.receipt_pending.buyer": { ar: "بانتظار مراجعة الإدارة لاعتماد الاستلام", en: "Awaiting admin review for receipt confirmation." },

  // Confirmation dialogs
  "deal.confirm.payment.title": { ar: "تأكيد الدفع (حوالة بنكية)", en: "Confirm Payment (Bank Transfer)" },
  "deal.confirm.payment.desc": { ar: "هل تأكدت من تحصيل الدفع من المشتري؟ لا يمكن التراجع عن هذه الخطوة.", en: "Have you confirmed receipt of payment from the buyer? This step cannot be undone." },
  "deal.confirm.dispatch.title": { ar: "تأكيد إرسال البضاعة", en: "Confirm Dispatch" },
  "deal.confirm.dispatch.desc": { ar: "هل تأكدت من إرسال البضاعة للمشتري؟ لا يمكن التراجع عن هذه الخطوة.", en: "Have you dispatched the goods to the buyer? This step cannot be undone." },
  "deal.confirm.receipt.title": { ar: "تأكيد استلام البضاعة", en: "Confirm Receipt" },
  "deal.confirm.receipt.desc": { ar: "هل تأكدت من استلام البضاعة من المنتج؟ لا يمكن التراجع عن هذه الخطوة.", en: "Have you received the goods from the producer? This step cannot be undone." },

  // Item 3 — Payment reference
  "deal.field.payment_reference": { ar: "رقم الحوالة / مرجع الدفع", en: "Transfer Reference No." },
  "deal.field.payment_reference.placeholder": { ar: "مثال: TRF-20241201-001", en: "e.g. TRF-20241201-001" },
  "deal.field.payment_reference.hint": { ar: "أدخل رقم الحوالة البنكية أو مرجع العملية", en: "Enter bank transfer number or transaction reference" },
  "deal.upload.label": { ar: "إثبات الدفع / إيصال الحوالة (اختياري)", en: "Payment Proof / Transfer Receipt (Optional)" },
  "deal.upload.hint": { ar: "JPG · PNG · PDF — حتى 5 ميغابايت", en: "JPG · PNG · PDF — up to 5MB" },
  "deal.upload.drop_hint": { ar: "اسحب الملف هنا أو", en: "Drop file here or" },
  "deal.upload.browse": { ar: "اختر ملفاً", en: "Browse" },
  "deal.upload.error.type": { ar: "صيغة غير مدعومة — استخدم JPG أو PNG أو PDF", en: "Unsupported format — use JPG, PNG or PDF" },
  "deal.upload.error.size": { ar: "الملف أكبر من 5 ميغابايت", en: "File exceeds 5MB" },
  "deal.upload.remove": { ar: "إزالة الملف", en: "Remove file" },
  "deal.payment.success": { ar: "تم تأكيد الدفع بنجاح ✓", en: "Payment confirmed successfully ✓" },
  "deal.transport.need_transport": { ar: "هل تحتاج خدمة نقل؟", en: "Do you need transport?" },
  "deal.transport.create_btn": { ar: "إنشاء طلب نقل", en: "Create Transport Request" },
  "deal.transport.skip_btn": { ar: "لا أحتاج نقل", en: "Skip Transport" },
  "deal.transport.smart.section_title": { ar: "الخطوة التالية: ترتيب النقل", en: "Next Step: Arrange Transport" },
  "deal.transport.smart.desc": { ar: "هل تحتاج مساعدة في نقل المواد؟ سجّل طلب النقل وسيتم التنسيق قريبًا.", en: "Need help moving the materials? Register a transport request and coordination will begin shortly." },
  "deal.transport.smart.prompt_title": { ar: "النقل مسؤوليتك — كيف ترغب في ترتيب النقل؟", en: "Transport is your responsibility — how would you like to arrange it?" },
  "deal.transport.smart.prompt_helper": { ar: "يمكنك طلب مساعدة تدويرة في ترتيب النقل، أو ترتيب النقل بنفسك خارج المنصة.", en: "You can request Tadweerah's help to arrange transport, or arrange it yourself outside the platform." },
  "deal.transport.smart.arrange_btn": { ar: "رتّبوا لي النقل عبر تدويرة", en: "Arrange Transport for Me via Tadweerah" },
  "deal.transport.smart.arrange_card_helper": { ar: "سيصل الطلب إلى فريق تدويرة للتنسيق معك.", en: "Your request will reach the Tadweerah team to coordinate with you." },
  "deal.transport.smart.self_arrange_btn": { ar: "سأرتب النقل بنفسي", en: "I'll Arrange Transport Myself" },
  "deal.transport.smart.self_arrange_helper": { ar: "سأقوم بالتنسيق مباشرة مع الطرف الآخر أو الناقل.", en: "I will coordinate directly with the other party or carrier." },
  "deal.transport.smart.skip_btn": { ar: "سأرتب النقل بنفسي", en: "I'll Arrange Transport Myself" },
  "deal.transport.smart.locked": { ar: "سيتم تفعيل خطوة النقل بعد تأكيد الدفع.", en: "The transport step will be activated after payment is confirmed." },
  "deal.transport.smart.requested": { ar: "تم استلام طلب النقل", en: "Transport Request Received" },
  "deal.transport.smart.requested_desc": { ar: "فريق تدويرة يعمل على التنسيق مع الناقل — سنتواصل معك قريبًا.", en: "The Tadweerah team is coordinating with a carrier — we will follow up with you shortly." },
  "deal.transport.smart.requested_line1": { ar: "تم استلام طلب النقل من قبل فريق تدويرة.", en: "Your transport request has been received by the Tadweerah team." },
  "deal.transport.smart.requested_line2": { ar: "نأمل تزويدنا بتفاصيل الشحنة المراد نقلها (نوع المادة، الكمية، موقع الاستلام) عبر الواتساب أو الاتصال على:", en: "Please share shipment details (material type, quantity, pickup location) via WhatsApp or call:" },
  "deal.transport.smart.requested_line3": { ar: "وذلك لاستكمال إجراءات التنسيق في أسرع وقت.", en: "so we can proceed with coordination." },
  "deal.transport.smart.assigned": { ar: "تم تعيين ناقل", en: "Carrier Assigned" },
  "deal.transport.smart.in_progress": { ar: "النقل جارٍ", en: "Transport in Progress" },
  "deal.transport.smart.completed_tr": { ar: "تم إكمال النقل", en: "Transport Completed" },
  "deal.transport.smart.cancelled": { ar: "تم إلغاء طلب النقل", en: "Transport Request Cancelled" },
  "deal.transport.smart.not_required": { ar: "تم تسجيل أن الصفقة لا تحتاج إلى خدمة نقل.", en: "Transport has been recorded as not required for this deal." },
  "deal.transport.smart.arrange_success": { ar: "تم استلام طلب النقل. فريق تدويرة يعمل على التنسيق مع الناقل.", en: "Transport request received. The Tadweerah team is coordinating with a carrier." },
  "deal.transport.smart.skip_confirm_title": { ar: "تأكيد: لا تحتاج نقل؟", en: "Confirm: No Transport Needed?" },
  "deal.transport.smart.skip_confirm_desc": { ar: "هل أنت متأكد أن هذه الصفقة لا تحتاج إلى خدمة نقل؟ يمكنك التواصل معنا لاحقاً إذا احتجت مساعدة.", en: "Are you sure this deal doesn't require transport? You can contact us later if you need assistance." },
  "deal.transport.smart.skip_confirm_ok": { ar: "نعم، لا أحتاج نقل", en: "Yes, No Transport Needed" },
  "deal.transport.smart.dispatched_no_tr": { ar: "لم يتم ترتيب نقل لهذه الصفقة. البضاعة في طريقها إليك.", en: "No transport was arranged for this deal. Goods are on their way to you." },
  "deal.transport.not_your_responsibility": { ar: "الطرف الآخر مسؤول بالكامل عن ترتيب النقل في هذه الصفقة.", en: "The other party is solely responsible for arranging transport for this deal." },
  "deal.transport.not_responsible_buyer": { ar: "النقل مسؤولية المشتري. بانتظار المشتري لاختيار طريقة النقل.", en: "Transport is the buyer's responsibility. Waiting for the buyer to choose a transport method." },
  "deal.transport.not_responsible_seller": { ar: "النقل مسؤولية البائع. بانتظار البائع لاختيار طريقة النقل.", en: "Transport is the seller's responsibility. Waiting for the seller to choose a transport method." },
  "deal.transport.platform_selected_seller": { ar: "تم اختيار ترتيب النقل عبر تدويرة. يمكنك الآن تأكيد إرسال البضاعة بعد التنسيق التشغيلي.", en: "Tadweerah transport has been selected. You can now confirm dispatch after operational coordination." },
  "deal.transport.buyer_self_managed_seller": { ar: "المشتري سيتولى ترتيب النقل. يمكنك الآن تأكيد إرسال البضاعة عند التسليم للناقل أو المشتري.", en: "The buyer will arrange transport. You can confirm dispatch upon handover to the carrier or buyer." },
  "deal.action.confirm_handover": { ar: "تأكيد تسليم البضاعة للمشتري / الناقل", en: "Confirm Handover to Buyer / Carrier" },
  "deal.dispatch.buyer_transport_hint": { ar: "النقل مسؤولية المشتري. لا تؤكد التسليم إلا بعد حضور المشتري أو الناقل.", en: "Transport is the buyer's responsibility. Only confirm handover after the buyer or carrier arrives." },
  "deal.step_current.active.buyer": { ar: "الخطوة الحالية: إرسال مرجع الدفع", en: "Current step: Submit Payment" },
  "deal.step_current.payment_submitted.producer": { ar: "الخطوة الحالية: تأكيد استلام الدفع", en: "Current step: Confirm Payment Receipt" },
  "deal.step_current.payment_confirmed.producer": { ar: "الخطوة الحالية: إرسال البضاعة", en: "Current step: Dispatch Goods" },
  "deal.step_current.dispatched.buyer": { ar: "الخطوة الحالية: تأكيد الاستلام", en: "Current step: Confirm Receipt" },
  "deal.error.payment_reference_required": { ar: "رقم مرجع الدفع مطلوب", en: "Payment reference is required" },
  "deal.field.actual_quantity.dispatch_hint": { ar: "أدخل الكمية من قراءة الميزان عند الاستلام", en: "Enter quantity from weighbridge reading at pickup" },
  "deal.error.quantity_required_for_dispatch": { ar: "الكمية الفعلية (قراءة الوزن) مطلوبة لتأكيد الإرسال", en: "Actual quantity (weighbridge reading) is required to confirm dispatch" },
  "deal.error.transport_request_required": { ar: "يجب إنشاء طلب نقل لهذه الصفقة قبل تأكيد الإرسال", en: "A transport request must be created for this deal before confirming dispatch" },
  "deal.error.vehicle_plate_required": { ar: "يجب إدخال رقم لوحة المركبة في طلب النقل قبل تأكيد الإرسال", en: "Vehicle plate must be set on the transport request before confirming dispatch" },
  "transport.create.vehicle_plate": { ar: "لوحة المركبة", en: "Vehicle Plate" },
  "transport.create.vehicle_plate.hint": { ar: "مطلوب قبل تأكيد إرسال البضاعة", en: "Required before confirming dispatch" },
  "transport.create.mode.label": { ar: "كيف سيتم النقل؟", en: "How will transport be arranged?" },
  "transport.create.mode.platform": { ar: "نقل عبر المنصة", en: "Platform transport" },
  "transport.create.mode.platform.desc": { ar: "أنشر طلب النقل للناقلين المسجلين في المنصة", en: "Post the request to registered carriers on the platform" },
  "transport.create.mode.self_managed": { ar: "نقل ذاتي / مرتب مسبقاً", en: "Self-managed transport" },
  "transport.create.mode.self_managed.desc": { ar: "لديك أسطول خاص أو ترتيب مسبق مع ناقل", en: "You have your own fleet or a pre-arranged carrier" },
  "transport.create.transporter_name": { ar: "اسم الناقل", en: "Transporter name" },
  "transport.create.transporter_name.placeholder": { ar: "مثال: شركة النقل الخضراء / سائق خاص", en: "e.g. Green Logistics Co. / Own fleet" },
  "cr.gate.listing": { ar: "السجل التجاري مطلوب قبل إنشاء الإعلانات. يرجى تحديث ملف شركتك.", en: "Commercial Registration is required before creating listings. Update your company profile." },
  "cr.gate.offer": { ar: "السجل التجاري مطلوب قبل تقديم العروض. يرجى تحديث ملف شركتك.", en: "Commercial Registration is required before submitting offers. Update your company profile." },

  // Item 2 — Self-bidding warning
  "offer.warning.already_top": {
    ar: "أنت حالياً أعلى مزايد على هذا الإعلان. يمكنك رفع عرضك إذا رأيت مناسبًا.",
    en: "You are currently the top bidder on this listing. You may raise your offer if you wish.",
  },
  "offer.warning.already_top.fixed": {
    ar: "أنت حالياً صاحب أعلى عرض إجمالي لهذا الإعلان. يمكنك تحسين عرضك إذا رأيت ذلك مناسباً.",
    en: "You currently hold the highest total offer for this listing. You may improve your offer if you wish.",
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
  "listing.form.eligibleCompanyType": { ar: "من يمكنه التقديم على هذا الإعلان؟", en: "Who can submit offers on this listing?" },
  "listing.form.eligibleCompanyType.hint": { ar: "يمكنك تخصيص الإعلان للشركات المرخصة من موان فقط، أو فتحه لجميع الشركات المسجلة", en: "You can restrict this listing to MWAN-licensed companies or open it to all registered companies" },
  "listing.eligible.ALL.label": { ar: "الجميع", en: "All companies" },
  "listing.eligible.ALL.desc": { ar: "أي شركة مسجلة في المنصة يمكنها تقديم عرض — يزيد من السيولة والمنافسة", en: "Any registered company on the platform can submit an offer — maximises liquidity and competition" },
  "listing.eligible.LICENSED_ONLY.label": { ar: "الشركات المرخصة من موان فقط", en: "MWAN-licensed companies only" },
  "listing.eligible.LICENSED_ONLY.desc": { ar: "فقط الشركات التي لديها ترخيص معتمد من موان — يوفر ضمانًا إضافيًا للامتثال", en: "Only companies with an approved MWAN license — provides additional compliance assurance" },
  "listing.eligible.badge": { ar: "الشركات المرخصة من موان فقط", en: "MWAN-licensed companies only" },
  "listing.eligible.blocked.title": { ar: "هذا الإعلان للشركات المرخصة فقط", en: "This listing is for licensed companies only" },
  "listing.eligible.blocked.desc": { ar: "هذا الإعلان متاح فقط للشركات التي لديها ترخيص معتمد من موان. لتقديم عرض، يجب أن تمتلك رقم ترخيص معتمد من مَوَن.", en: "This listing is available only to companies with an approved MWAN license. To submit an offer, your company must have an approved MWAN license number." },
  "listing.eligible.blocked.expired.title": { ar: "انتهت صلاحية ترخيصك", en: "Your license has expired" },
  "listing.eligible.blocked.expired.desc": { ar: "ترخيص موان الخاص بشركتك منتهي الصلاحية. يرجى تجديد الترخيص لتتمكن من تقديم عروض على هذا النوع من الإعلانات.", en: "Your company's MWAN license has expired. Please renew your license to be able to submit offers on this type of listing." },

  // ── Eligibility Rules Engine — reason → UI message ───────────────────────
  // These are the canonical user-facing messages for each eligibility reason.
  // Used by useEligibility() hook and should match backend error codes exactly.
  "eligibility.OwnListing.title":             { ar: "هذا إعلانك الخاص", en: "This is your listing" },
  "eligibility.OwnListing.desc":              { ar: "لا يمكنك تقديم عرض على إعلان أنشأته بنفسك.", en: "You cannot submit an offer on a listing you created." },
  "eligibility.ListingClosed.title":          { ar: "الإعلان مغلق", en: "Listing closed" },
  "eligibility.ListingClosed.desc":           { ar: "هذا الإعلان لم يعد يقبل عروضاً.", en: "This listing is no longer accepting offers." },
  "eligibility.CompanyIncomplete.title":      { ar: "أكمل بيانات شركتك", en: "Complete your company profile" },
  "eligibility.CompanyIncomplete.desc":       { ar: "يجب إكمال ملف شركتك وتقديمه للمراجعة قبل تقديم العروض.", en: "Complete your company profile and submit it for review before placing offers." },
  "eligibility.CompanyPending.title":         { ar: "حسابك قيد المراجعة", en: "Account under review" },
  "eligibility.CompanyPending.desc":          { ar: "شركتك تحت المراجعة. ستتمكن من تقديم عروض بمجرد الاعتماد.", en: "Your company is under review. You'll be able to submit offers once approved." },
  "eligibility.CompanyRejected.title":        { ar: "تم رفض تسجيل شركتك", en: "Company registration rejected" },
  "eligibility.CompanyRejected.desc":         { ar: "تم رفض تسجيل شركتك. يرجى التواصل مع الدعم.", en: "Your company registration was rejected. Please contact support." },
  "eligibility.CompanyExpired.title":         { ar: "ترخيص الشركة منتهٍ", en: "Company license expired" },
  "eligibility.CompanyExpired.desc":          { ar: "انتهت صلاحية ترخيص شركتك الإداري. يرجى التجديد قبل تقديم العروض.", en: "Your company's administrative license has expired. Please renew before submitting offers." },
  "eligibility.OfferSubmissionBlocked.title": { ar: "تم تعليق حسابك مؤقتاً", en: "Account temporarily suspended" },
  "eligibility.OfferSubmissionBlocked.desc":  { ar: "شركتك محظورة مؤقتاً من تقديم العروض. تواصل مع فريق الدعم لمزيد من المعلومات.", en: "Your company is temporarily blocked from submitting offers. Contact support for details." },
  "eligibility.TermsNotAccepted.title":       { ar: "يجب قبول الشروط والأحكام", en: "Terms & Conditions required" },
  "eligibility.TermsNotAccepted.desc":        { ar: "يجب قبول شروط وأحكام المنصة أثناء التسجيل قبل تقديم أي عرض.", en: "You must accept the platform's Terms & Conditions during registration before submitting any offer." },
  "eligibility.LicenseRequired.title":        { ar: "هذا الإعلان للشركات المرخصة من موان فقط", en: "MWAN license required" },
  "eligibility.LicenseRequired.desc":         { ar: "هذا الإعلان متاح فقط للشركات التي لديها ترخيص معتمد من موان. أضف رقم ترخيص شركتك من ملف الشركة.", en: "This listing is available only to companies with an approved MWAN license. Add your license number from the company profile." },
  "eligibility.LicenseExpired.title":         { ar: "ترخيص موان الخاص بك منتهٍ", en: "Your MWAN license has expired" },
  "eligibility.LicenseExpired.desc":          { ar: "انتهت صلاحية ترخيص موان لشركتك. يرجى تجديده لتتمكن من التقديم على هذا النوع من الإعلانات.", en: "Your MWAN license has expired. Please renew it to submit offers on this type of listing." },
  "eligibility.TargetingRestricted.title":    { ar: "هذا الإعلان غير متاح لشركتك", en: "This listing is not available to you" },
  "eligibility.TargetingRestricted.desc":     { ar: "هذا إعلان مباشر موجَّه لشركة أو فئة محددة ولا تشمل شركتك.", en: "This is a direct listing directed to a specific company or category that does not include yours." },
  "eligibility.MissingCapability.title":      { ar: "خدمة مطلوبة غير متوفرة لديك", en: "Missing required service" },
  "eligibility.MissingCapability.desc":       { ar: "شركتك لا تملك إحدى الخدمات المطلوبة لهذا الإعلان. أضف الخدمات من ملف شركتك.", en: "Your company doesn't have a required service for this listing. Add capabilities from your company profile." },
  "eligibility.SensitiveMaterial.title":      { ar: "مادة حساسة — يتطلب ترخيصاً", en: "Sensitive material — license required" },
  "eligibility.SensitiveMaterial.desc":       { ar: "هذا الإعلان يحتوي على مادة تتطلب ترخيصاً معتمداً من موان للتعامل معها.", en: "This listing contains a material category that requires an approved MWAN license to handle." },
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
  "license.mwan.badge": { ar: "مرخص من موان", en: "MWAN Licensed" },
  "license.validity.expired.badge": { ar: "ترخيص منتهي", en: "License Expired" },
  "license.validity.expired.title": { ar: "انتهت صلاحية ترخيص موان", en: "MWAN license has expired" },
  "license.validity.expiring_soon.tooltip": { ar: "ينتهي قريباً", en: "Expiring soon" },
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
  "members.invite.hint": { ar: "أدخل البريد الإلكتروني للشخص الذي ترغب بإضافته كعضو. سيتم دعوته للشركة تلقائياً عند تسجيل الدخول.", en: "Enter the email of the person you want to add. They will be invited automatically upon sign in." },
  "members.invite.placeholder": { ar: "member@example.com", en: "member@example.com" },
  "members.invite.cta": { ar: "إضافة", en: "Add" },
  "members.invite.success": { ar: "تمت إضافة العضو بنجاح", en: "Member added successfully" },
  "members.invite.error.empty": { ar: "يرجى إدخال البريد الإلكتروني", en: "Please enter an email address" },
  "members.invite.error.generic": { ar: "حدث خطأ. يرجى المحاولة مجدداً", en: "Something went wrong. Please try again" },
  "members.remove.cta": { ar: "إزالة العضو", en: "Remove Member" },
  "members.remove.error.generic": { ar: "فشل إزالة العضو. يرجى المحاولة مرة أخرى.", en: "Failed to remove member. Please try again." },
  "members.remove.confirm.title": { ar: "تأكيد إزالة العضو", en: "Confirm Member Removal" },
  "members.remove.confirm.desc": { ar: "هل أنت متأكد من إزالة هذا العضو من شركتك؟ لن يتمكن بعد ذلك من الوصول إلى أي من بياناتها.", en: "Are you sure you want to remove this member from your company? They will no longer have access to any company data." },
  "members.section.owner": { ar: "مالك الحساب", en: "Account Owner" },
  "members.section.members": { ar: "أعضاء الفريق", en: "Team Members" },
  "members.noMembers": { ar: "لا يوجد أعضاء إضافيون بعد", en: "No additional members yet" },
  "members.userId.label": { ar: "نسخ المعرّف", en: "Copy ID" },
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
  "offer.confirm.alreadyTop.popup.title.fixed": {
    ar: "أنت صاحب أعلى عرض إجمالي حالياً",
    en: "You currently hold the highest total offer",
  },
  "offer.confirm.alreadyTop.popup.desc": {
    ar: "عرضك الحالي هو الأعلى على هذا الإعلان. هل تريد رفع عرضك؟ هذا لن يلغي الصفقة الحالية، لكنه سيزيد من التزامك.",
    en: "Your offer is currently the highest on this listing. Do you want to raise it anyway? This won't cancel anything, but your committed price will increase.",
  },
  "offer.confirm.alreadyTop.popup.desc.fixed": {
    ar: "عرضك الإجمالي هو الأعلى حالياً. هل تريد رفعه لتحسين عرضك؟",
    en: "Your total offer is currently the highest. Do you want to raise it to improve your offer?",
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

  // P4 — Deal stage descriptions
  "deal.stage.action.active.buyer": {
    ar: "أرسل مرجع الدفع للمنتج لتأكيد انتقال الصفقة للمرحلة التالية",
    en: "Submit your payment reference so the producer can confirm receipt",
  },
  "deal.stage.action.active.producer": {
    ar: "في انتظار المشتري لإرسال مرجع الدفع",
    en: "Waiting for the buyer to submit the payment reference",
  },
  "deal.stage.action.payment_submitted.producer": {
    ar: "المشتري أرسل مرجع الدفع — تحقق منه وأكّد استلام الدفع",
    en: "Buyer submitted the payment reference — verify and confirm receipt",
  },
  "deal.stage.action.payment_submitted.buyer": {
    ar: "في انتظار المنتج لتأكيد استلام الدفع",
    en: "Waiting for the producer to confirm payment receipt",
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
  "deal.stage.action.receipt_pending.producer": {
    ar: "الاستلام قيد مراجعة الإدارة",
    en: "Receipt under admin review",
  },
  "deal.stage.action.receipt_pending.buyer": {
    ar: "تم تأكيد الاستلام — بانتظار الاعتماد النهائي",
    en: "Receipt confirmed — awaiting final admin review",
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

  // ── My Reports page (company-facing operational deal report) ─────────────
  "reports.deals.title":   { ar: "تقاريري", en: "My Reports" },
  "reports.deals.subtitle": {
    ar: "راجع صفقاتك وملخصك المالي التشغيلي",
    en: "Review your deals and operational financial summary",
  },

  "reports.filter.date_from":  { ar: "من تاريخ",   en: "Date From" },
  "reports.filter.date_to":    { ar: "إلى تاريخ",  en: "Date To" },
  "reports.filter.status":     { ar: "الحالة",      en: "Status" },
  "reports.filter.city":       { ar: "المدينة",     en: "City" },
  "reports.filter.role":       { ar: "دوري",        en: "My Role" },
  "reports.filter.role.all":   { ar: "الكل",        en: "All" },
  "reports.filter.role.seller":{ ar: "مبيعاتي",    en: "My Sales" },
  "reports.filter.role.buyer": { ar: "مشترياتي",   en: "My Purchases" },
  "reports.filter.company":    { ar: "الشركة (ID)", en: "Company (ID)" },
  "reports.filter.all_statuses": { ar: "جميع الحالات", en: "All Statuses" },

  "reports.action.load":       { ar: "عرض التقرير", en: "View Report" },
  "reports.action.export_csv": { ar: "تصدير CSV",     en: "Export CSV" },
  "reports.action.open_deal":  { ar: "فتح",           en: "Open" },
  "reports.action.exporting":  { ar: "جاري التصدير…", en: "Exporting…" },
  "reports.loading":           { ar: "جاري تحميل التقرير…", en: "Loading report…" },
  "reports.empty":             { ar: "لا توجد صفقات للفترة المحددة", en: "No deals found for the selected period" },

  "reports.summary.total":           { ar: "إجمالي الصفقات",             en: "Total Deals" },
  "reports.summary.completed":       { ar: "مكتملة",                    en: "Completed" },
  "reports.summary.active":          { ar: "نشطة / قيد التنفيذ",        en: "Active / In Progress" },
  "reports.summary.amount_before_vat":{ ar: "المبلغ قبل الضريبة (ريال)", en: "Amount Before VAT (SAR)" },
  "reports.summary.vat_amount":      { ar: "ضريبة القيمة المضافة",       en: "VAT Amount" },
  "reports.summary.total_with_vat":  { ar: "الإجمالي شامل الضريبة",      en: "Total incl. VAT" },

  "reports.col.date":        { ar: "التاريخ",           en: "Date" },
  "reports.col.deal_id":     { ar: "رقم الصفقة",        en: "Deal ID" },
  "reports.col.seller":      { ar: "البائع / المنتج",   en: "Seller / Producer" },
  "reports.col.buyer":       { ar: "المشتري",           en: "Buyer" },
  "reports.col.role":        { ar: "دوري",              en: "My Role" },
  "reports.col.counterparty":{ ar: "الطرف الآخر",       en: "Counterparty" },
  "reports.col.material":    { ar: "المادة",             en: "Material" },
  "reports.col.quantity":    { ar: "الكمية / الوحدة",   en: "Qty / Unit" },
  "reports.col.city":        { ar: "المدينة",            en: "City" },
  "reports.col.status":      { ar: "الحالة",             en: "Status" },
  "reports.col.amount":      { ar: "المبلغ (قبل الضريبة)", en: "Amount (Before VAT)" },
  "reports.col.vat":         { ar: "الضريبة",            en: "VAT" },
  "reports.col.total":       { ar: "الإجمالي",           en: "Total" },
  "reports.col.transport":   { ar: "النقل",              en: "Transport" },
  "reports.col.action":      { ar: "الإجراء",            en: "Action" },

  "reports.role.seller": { ar: "بائع", en: "Seller" },
  "reports.role.buyer":  { ar: "مشترٍ", en: "Buyer" },

  "reports.transport.not_required": { ar: "غير مطلوب",     en: "Not Required" },
  "reports.transport.pending":      { ar: "قيد الانتظار", en: "Pending" },
  "reports.transport.accepted":     { ar: "مقبول",         en: "Accepted" },
  "reports.transport.in_transit":   { ar: "قيد النقل",    en: "In Transit" },
  "reports.transport.delivered":    { ar: "تم التسليم",   en: "Delivered" },
  "reports.transport.closed":       { ar: "مغلق",          en: "Closed" },
  "reports.transport.completed":    { ar: "مكتمل",         en: "Completed" },
  "reports.transport.cancelled":    { ar: "ملغي",           en: "Cancelled" },

  // Admin reports tab
  "admin.tab.reports":           { ar: "التقارير",    en: "Reports" },
  "admin.tab.issues":            { ar: "مشاكل العملاء", en: "Customer Issues" },
  "admin.reports.filter.company_id": { ar: "معرّف الشركة (اختياري)", en: "Company ID (optional)" },
  "admin.reports.fetch":         { ar: "عرض التقرير", en: "View Report" },
  "admin.reports.export_csv":    { ar: "تصدير CSV",    en: "Export CSV" },
  "admin.reports.empty":         { ar: "لا توجد صفقات بهذه المعايير", en: "No deals match these criteria" },

  "deal.status.payment_submitted": { ar: "بانتظار تأكيد الدفع", en: "Payment Submitted" },
  "deal.status.receipt_pending":   { ar: "بانتظار تأكيد الاستلام", en: "Awaiting Receipt Confirmation" },
  "deal.status.expired":           { ar: "منتهية الصلاحية", en: "Expired" },
  "deal.status.cancelled":         { ar: "ملغاة", en: "Cancelled" },

  // Dashboard: empty-state onboarding CTA
  "dashboard.primary.producer": { ar: "للمنتجين", en: "For producers" },
  "dashboard.primary.buyer":    { ar: "للمشترين", en: "For buyers" },
  "dashboard.tools.title":      { ar: "أدوات المنصة", en: "Platform tools" },
  "dashboard.next.offers_received":     { ar: "لديك عروض وصلتك — راجعها الآن", en: "You have incoming offers — review them now" },
  "dashboard.next.offers_received.cta": { ar: "إعلاناتي", en: "My listings" },
  "dashboard.next.offers_made":         { ar: "عروضك المقدمة قيد المراجعة", en: "Your submitted offers are under review" },
  "dashboard.next.offers_made.cta":     { ar: "مشاركاتي", en: "My participations" },
  "dashboard.next.offers_made.title":   { ar: "عروضك قيد المراجعة", en: "Offers Under Review" },
  "dashboard.next.offers_made.helper":  { ar: "تابع حالة العروض التي قدمتها", en: "Track the status of offers you submitted" },
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
  "profile.roles_save": { ar: "حفظ الأدوار", en: "Save Roles" },
  "profile.roles_saved": { ar: "تم تحديث أدوار الشركة بنجاح. ستظهر التغييرات في لوحة التحكم.", en: "Company roles updated. Changes are now reflected in the dashboard." },
  "profile.error.required": { ar: "مطلوب", en: "is required" },
  "profile.license.status": { ar: "حالة الترخيص", en: "License Status" },
  "profile.license.approved": { ar: "معتمد", en: "Approved" },
  "profile.license.pending": { ar: "قيد المراجعة", en: "Under Review" },
  "profile.license.rejected": { ar: "مرفوض", en: "Rejected" },
  "profile.license.expired": { ar: "منتهي الصلاحية", en: "Expired" },

  // Company profile nav card in dashboard
  "profile.nav.title": { ar: "معلومات الشركة", en: "Company Information" },
  "profile.nav.subtitle": { ar: "عدّل بيانات شركتك وحدد الخدمات التي تستطيع تقديمها", en: "Update your company details and specify the services you provide" },

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

  "contract.shipment.status.planned": { ar: "مخططة", en: "Planned" },
  "contract.shipment.status.dispatched": { ar: "تم الشحن", en: "Dispatched" },
  "contract.shipment.status.received": { ar: "تم الاستلام", en: "Received" },
  "contract.shipment.status.closed": { ar: "مغلقة", en: "Closed" },
  "contract.shipment.status.cancelled": { ar: "ملغاة", en: "Cancelled" },


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
  "dashboard.pending.title": { ar: "إجراءات معلقة", en: "Pending Actions" },
  "dashboard.pending.empty": { ar: "لا توجد إجراءات معلقة حالياً", en: "No pending actions right now" },
  "dashboard.pending.cta": { ar: "اتخذ الإجراء", en: "Take Action" },
  "dashboard.pending.action.confirm_payment": { ar: "تأكيد استلام الدفع", en: "Confirm Payment Received" },
  "dashboard.pending.action.submit_payment": { ar: "استكمال تأكيد الدفع", en: "Complete payment confirmation" },
  "dashboard.pendingAction.submit_payment":  { ar: "استكمال تأكيد الدفع", en: "Complete payment confirmation" },
  "dashboard.pending.action.confirm_dispatch": { ar: "تأكيد إرسال البضاعة", en: "Confirm Goods Dispatch" },
  "dashboard.pending.action.confirm_receipt": { ar: "تأكيد استلام البضاعة", en: "Confirm Goods Receipt" },
  "dashboard.pending.action.choose_transport": { ar: "اختر طريقة النقل", en: "Choose Transport" },
  "dashboard.pending.action.transport_pending_producer": { ar: "في انتظار طلب النقل", en: "Transport Pending" },
  "dashboard.pending.action.transport_pending_buyer": { ar: "في انتظار طلب النقل", en: "Transport Pending" },

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
  "mwan.check.vehicle_plate_set": { ar: "لوحة المركبة مُدخَلة", en: "Vehicle plate entered" },
  "mwan.check.pickup_city": { ar: "مدينة الاستلام محددة", en: "Pickup city set" },
  "mwan.check.delivery_city": { ar: "مدينة التسليم محددة", en: "Delivery city set" },
  "mwan.check.waste_description": { ar: "وصف النفاية مكتمل", en: "Waste description complete" },
  "mwan.create_transport": { ar: "إنشاء طلب نقل", en: "Create Transport Request" },
  "mwan.view_transport": { ar: "عرض طلب النقل", en: "View Transport Request" },
  "mwan.loading": { ar: "جارٍ تحميل بيانات مَوَن...", en: "Loading MWAN data..." },
  "mwan.error": { ar: "تعذّر تحميل ملخص مَوَن", en: "Could not load MWAN summary" },
  "mwan.banner.missing_one": { ar: "عنصر واحد مطلوب لاكتمال البيان الإلكتروني", en: "1 item needed to complete the eManifest" },
  "mwan.banner.missing_many": { ar: "سيتم استكمال بيانات النقل والبيان الإلكتروني بعد تأكيد الدفع وتحديد تفاصيل الشحن.", en: "Transport and e-manifest details will be completed after payment confirmation and shipment details are provided." },
  "mwan.banner.ready": { ar: "البيان الإلكتروني مكتمل", en: "eManifest ready" },
  "mwan.section.deal": { ar: "الصفقة", en: "Deal" },
  "mwan.section.checklist": { ar: "قائمة التحقق", en: "Checklist" },
  "mwan.action.generator_cr": { ar: "أضف السجل التجاري في الملف الشركة", en: "Add CR in company profile" },
  "mwan.action.generator_license": { ar: "أضف رقم الترخيص في ملف الشركة", en: "Add license number in company profile" },
  "mwan.action.generator_city": { ar: "أضف المدينة في ملف الشركة", en: "Add city in company profile" },
  "mwan.action.receiver_cr": { ar: "المستلِم بحاجة لإضافة سجله التجاري", en: "Receiver must add their CR to their profile" },
  "mwan.action.receiver_license": { ar: "المستلِم بحاجة لإضافة رقم الترخيص", en: "Receiver must add their license number" },
  "mwan.action.receiver_city": { ar: "المستلِم بحاجة لإضافة المدينة", en: "Receiver must add their city" },
  "mwan.action.waste_defined": { ar: "تُحدَّد تلقائياً من بيانات الإعلان", en: "Set automatically from listing data" },
  "mwan.action.quantity_confirmed": { ar: "تُؤكَّد عند إدخال الوزن الفعلي (صفقات الوزن)", en: "Confirmed at dispatch weigh-in (by-weight deals)" },
  "mwan.action.payment_confirmed": { ar: "أكّد الدفع أعلاه لإتمام هذه الخطوة", en: "Confirm payment above to complete this step" },
  "mwan.action.transport_request_created": { ar: "أنشئ طلب نقل أدناه", en: "Create a transport request below" },
  "mwan.action.transporter_assigned": { ar: "عيّن ناقلاً في طلب النقل", en: "Assign a transporter in the transport request" },
  "mwan.action.vehicle_plate_set": { ar: "أدخل رقم اللوحة في طلب النقل", en: "Enter the vehicle plate in the transport request" },
  "mwan.action.pickup_city_set": { ar: "أضف مدينة الاستلام في طلب النقل", en: "Add pickup city in the transport request" },
  "mwan.action.delivery_city_set": { ar: "أضف مدينة التسليم في طلب النقل", en: "Add delivery city in the transport request" },
  "mwan.action.waste_description_set": { ar: "أضف وصف النفاية في طلب النقل", en: "Add waste description in the transport request" },
  "mwan.section.taxonomy": { ar: "التصنيف التنظيمي للنفايات", en: "Waste Regulatory Taxonomy" },

  // ── Regulatory Taxonomy ───────────────────────────────────────────────────
  "taxonomy.category": { ar: "الفئة", en: "Category" },
  "taxonomy.subcategory": { ar: "الفئة الفرعية", en: "Subcategory" },
  "taxonomy.regulatory_code": { ar: "الرمز التنظيمي", en: "Regulatory Code" },
  "taxonomy.hazard_level": { ar: "مستوى الخطورة", en: "Hazard Level" },
  "taxonomy.hazard_level.hazardous": { ar: "خطير", en: "Hazardous" },
  "taxonomy.hazard_level.non_hazardous": { ar: "غير خطير", en: "Non-Hazardous" },
  "taxonomy.hazard_level.inert": { ar: "خامل", en: "Inert" },
  "taxonomy.physical_state": { ar: "الحالة الفيزيائية", en: "Physical State" },
  "taxonomy.physical_state.solid": { ar: "صلب", en: "Solid" },
  "taxonomy.physical_state.liquid": { ar: "سائل", en: "Liquid" },
  "taxonomy.physical_state.gas": { ar: "غاز", en: "Gas" },
  "taxonomy.physical_state.sludge": { ar: "حمأة", en: "Sludge" },
  "taxonomy.physical_state.mixed": { ar: "مختلط", en: "Mixed" },
  "taxonomy.no_code": { ar: "بدون رمز", en: "No code" },
  "taxonomy.info.label": { ar: "بيانات التصنيف", en: "Classification Data" },

  "deal.progress.label": { ar: "مراحل الصفقة", en: "Deal Progress" },
  "deal.progress.active": { ar: "نشطة", en: "Active" },
  "deal.progress.payment": { ar: "الدفع", en: "Payment" },
  "deal.progress.dispatch": { ar: "الشحن", en: "Dispatch" },
  "deal.progress.delivery": { ar: "الاستلام", en: "Delivery" },
  "transport.create.title": { ar: "إنشاء طلب نقل", en: "Create Transport Request" },
  "transport.create.pickup_city": { ar: "مدينة الاستلام", en: "Pickup City" },
  "transport.create.delivery_city": { ar: "مدينة التسليم", en: "Delivery City" },
  "transport.create.waste_desc": { ar: "وصف النفاية", en: "Waste Description" },
  "transport.create.submit": { ar: "إرسال طلب النقل", en: "Submit Transport Request" },
  "transport.create.success": { ar: "تم إنشاء طلب النقل بنجاح ✓", en: "Transport request created ✓" },
  "transport.create.prefilled": { ar: "مملوء تلقائياً من بيانات الصفقة — يمكنك تعديله", en: "Auto-filled from deal data — you can edit" },
  "onboarding.mwan.cr_hint": { ar: "مطلوب في البيان الإلكتروني مَوَن — أضفه الآن لتسريع إصدار البيان لاحقاً", en: "Required for MWAN eManifest — add it now to speed up manifest generation later" },
  "profile.missing_compliance": { ar: "بيانات الامتثال ناقصة: أضف السجل التجاري ورقم الترخيص لإتمام متطلبات مَوَن.", en: "Compliance data incomplete: add CR and license number to meet MWAN eManifest requirements." },

  /* ── Pilot: Next Step Banner ── */
  "deal.next_step.active.producer": { ar: "أكّد الدفع عند استلام المبلغ للانتقال للمرحلة التالية", en: "Confirm payment once received to advance the deal" },
  "deal.next_step.active.buyer": { ar: "في انتظار تأكيد البائع للدفع", en: "Awaiting seller payment confirmation" },
  "deal.next_step.payment_confirmed.producer": { ar: "الدفع مؤكد — أنشئ طلب النقل الآن لمتابعة جاهزية مَوَن", en: "Payment confirmed — create a transport request now for MWAN readiness" },
  "deal.next_step.payment_confirmed.buyer": { ar: "في انتظار البائع لإنشاء طلب النقل وإرسال البضاعة", en: "Awaiting seller to create transport request and dispatch goods" },
  "deal.next_step.dispatched.producer": { ar: "البضاعة في الطريق — في انتظار تأكيد الاستلام من المشتري", en: "Goods in transit — awaiting buyer confirmation of receipt" },
  "deal.next_step.dispatched.buyer": { ar: "تأكد من استلام البضاعة لإغلاق الصفقة", en: "Confirm receipt of goods to close the deal" },
  "deal.next_step.open_tr_form": { ar: "أنشئ الآن", en: "Create Now" },

  /* ── Pilot: Manifest ref display ── */
  "deal.manifest_ref.label": { ar: "رقم بيان النقل", en: "Movement Manifest Ref" },
  "deal.manifest_ref.copy": { ar: "نسخ رقم البيان", en: "Copy manifest ref" },
  "deal.manifest_ref.copied": { ar: "تم النسخ", en: "Copied" },

  /* ── VIP: Verified badge + PDF download ── */
  "company.verified": { ar: "موثّقة", en: "Verified" },
  "deal.pdf.download": { ar: "تحميل ملخص PDF", en: "Download PDF Summary" },

  /* ── Pilot: Facility names in TR form ── */
  "transport.create.pickup_facility": { ar: "اسم منشأة الاستلام", en: "Pickup Facility Name" },
  "transport.create.pickup_facility.placeholder": { ar: "مثال: مصنع الرياض", en: "e.g. Riyadh Factory" },
  "transport.create.delivery_facility": { ar: "اسم منشأة التسليم", en: "Delivery Facility Name" },
  "transport.create.delivery_facility.placeholder": { ar: "مثال: مستودع جدة", en: "e.g. Jeddah Warehouse" },

  /* ── Pilot: MWAN actionable checklist ── */
  "mwan.action.add_now": { ar: "أضف الآن", en: "Add now" },

  /* ── Admin page ── */
  "admin.page.title": { ar: "لوحة إدارة الصفقات", en: "Deals Admin Panel" },
  "admin.page.subtitle": { ar: "مراقبة الصفقات وجاهزية بيانات مَوَن", en: "Monitor deals and MWAN eManifest readiness" },
  "admin.key.label": { ar: "مفتاح المدير (X-Admin-Key)", en: "Admin Key (X-Admin-Key)" },
  "admin.key.placeholder": { ar: "أدخل المفتاح السري", en: "Enter secret key" },
  "admin.fetch_button": { ar: "تحميل الصفقات", en: "Load Deals" },
  "admin.loading": { ar: "جارٍ التحميل...", en: "Loading..." },
  "admin.no_deals": { ar: "لا توجد صفقات تطابق الفلتر المحدد", en: "No deals match the selected filter" },
  "admin.filter.all_statuses": { ar: "كل الحالات", en: "All statuses" },
  "admin.deal.count": { ar: "{n} صفقة", en: "{n} deals" },
  "admin.deal.id": { ar: "معرّف الصفقة", en: "Deal ID" },
  "admin.deal.status": { ar: "الحالة", en: "Status" },
  "admin.deal.manifest_ref": { ar: "رقم البيان", en: "Manifest Ref" },
  "admin.deal.mwan_score": { ar: "جاهزية مَوَن", en: "MWAN Score" },
  "admin.deal.missing": { ar: "ناقص", en: "Missing" },
  "admin.deal.created_at": { ar: "تاريخ الإنشاء", en: "Created" },
  "admin.mwan.ready": { ar: "جاهزة", en: "ready" },
  "admin.mwan.incomplete": { ar: "ناقصة", en: "incomplete" },
  "admin.error.no_key": { ar: "يرجى إدخال مفتاح المدير أولاً", en: "Please enter an admin key first" },
  "admin.error.unauthorized": { ar: "مفتاح غير صحيح أو مرفوض", en: "Invalid or rejected admin key" },
  "admin.error.not_configured": { ar: "مفتاح المدير غير مُعدّ في الخادم", en: "Admin key not configured on server" },
  "admin.error.generic": { ar: "حدث خطأ أثناء التحميل", en: "An error occurred while loading" },
  "admin.logout": { ar: "تسجيل الخروج", en: "Logout" },

  /* ── Admin: Companies tab ── */
  "admin.tab.companies":  { ar: "الشركات",     en: "Companies" },
  "admin.tab.deals":      { ar: "الصفقات",     en: "Deals" },
  "admin.tab.transport":  { ar: "طلبات النقل", en: "Transport Requests" },

  /* ── Admin: Issues tab ── */
  "admin.issues.load":              { ar: "تحميل البلاغات", en: "Load Issues" },
  "admin.issues.count":             { ar: "{n} بلاغ", en: "{n} issues" },
  "admin.issues.empty":             { ar: "لا توجد بلاغات حالياً", en: "No issues yet" },
  "admin.issues.mark_in_review":    { ar: "قيد المراجعة", en: "Mark In Review" },
  "admin.issues.mark_closed":       { ar: "إغلاق", en: "Close" },
  "admin.issues.filter.all":        { ar: "كل الحالات", en: "All statuses" },
  "admin.issues.status.open":       { ar: "مفتوح", en: "Open" },
  "admin.issues.status.in_review":  { ar: "قيد المراجعة", en: "In Review" },
  "admin.issues.status.closed":     { ar: "مغلق", en: "Closed" },
  "admin.issues.status.resolved":   { ar: "محلول", en: "Resolved" },
  "admin.issues.col.date":          { ar: "التاريخ", en: "Date" },
  "admin.issues.col.user":          { ar: "المستخدم", en: "User" },
  "admin.issues.col.subject":       { ar: "الموضوع", en: "Subject" },
  "admin.issues.col.message":       { ar: "الرسالة", en: "Message" },
  "admin.issues.col.status":        { ar: "الحالة", en: "Status" },
  "admin.issues.col.actions":       { ar: "الإجراء", en: "Actions" },

  /* ── Admin: Transport tab ── */
  "admin.transport.title":       { ar: "طلبات النقل المعلقة (platform-ops)", en: "Pending Platform Transport Requests" },
  "admin.transport.desc":        { ar: "الطلبات التي اختار فيها المنتج 'رتّب النقل لي' وتحتاج تنسيقًا", en: "Requests where the producer chose 'Arrange Transport for Me' and need coordination" },
  "admin.transport.load":        { ar: "تحميل الطلبات", en: "Load Requests" },
  "admin.transport.count":       { ar: "{n} طلب معلق", en: "{n} pending requests" },
  "admin.transport.empty_count": { ar: "لا توجد طلبات معلقة", en: "No pending requests" },
  "admin.transport.empty":       { ar: "لا توجد طلبات نقل معلقة حاليًا.", en: "No pending transport requests at this time." },
  "admin.transport.status.pending": { ar: "معلق", en: "Pending" },
  "admin.transport.planned_pickup": { ar: "موعد الاستلام المخطط: ", en: "Planned pickup: " },
  "admin.action.select":            { ar: "اختر...", en: "Select..." },
  "admin.action.apply":             { ar: "تطبيق", en: "Apply" },
  "admin.role.label":               { ar: "مدير تدويرة", en: "Tadweerah Admin" },
  "admin.company.fetch":         { ar: "تحميل الشركات", en: "Load Companies" },
  "admin.company.count":         { ar: "{n} شركة", en: "{n} companies" },
  "admin.company.empty":         { ar: "لا توجد شركات تطابق الفلتر", en: "No companies match the filter" },
  "admin.company.name":          { ar: "الاسم", en: "Name" },
  "admin.company.type":          { ar: "الدور", en: "Role" },
  "admin.company.cr":            { ar: "السجل التجاري", en: "CR" },
  "admin.company.city":          { ar: "المدينة", en: "City" },
  "admin.company.status":        { ar: "حالة الترخيص", en: "License Status" },
  "admin.company.change_status": { ar: "تغيير الحالة", en: "Change Status" },
  "admin.company.status_filter": { ar: "فلتر الحالة", en: "Status Filter" },

  /* ── Company types ── */
  "company.type.producer":    { ar: "منتج نفايات", en: "Waste Producer" },
  "company.type.buyer":       { ar: "مُعيد تدوير", en: "Recycler / Buyer" },
  "company.type.transporter": { ar: "ناقل", en: "Transporter" },

  /* ── Offer/listing error codes for company status ── */
  "offer.error.CompanyIncomplete": {
    ar: "ملف شركتك غير مكتمل. أكمل البيانات المطلوبة وانتظر مراجعة الفريق لتتمكن من تقديم عروض.",
    en: "Your company profile is incomplete. Complete your company data and wait for review before submitting offers.",
  },
  "offer.error.CompanyPending": {
    ar: "شركتك قيد المراجعة حالياً. ستتمكن من تقديم عروض بمجرد الاعتماد.",
    en: "Your company is currently under review. You will be able to submit offers once approved.",
  },
  "offer.error.CompanyExpired": {
    ar: "انتهت صلاحية ترخيص شركتك. يرجى تجديد الترخيص قبل تقديم العروض.",
    en: "Your company license has expired. Please renew your license before submitting offers.",
  },
  "listing.error.CompanyIncomplete": {
    ar: "ملف شركتك غير مكتمل. أكمل البيانات المطلوبة وانتظر مراجعة الفريق لتتمكن من نشر إعلانات.",
    en: "Your company profile is incomplete. Complete your company data and wait for review before publishing listings.",
  },
  "listing.error.CompanyPending": {
    ar: "شركتك قيد المراجعة حالياً. ستتمكن من نشر إعلانات بمجرد الاعتماد.",
    en: "Your company is currently under review. You will be able to publish listings once approved.",
  },
  "listing.error.CompanyExpired": {
    ar: "انتهت صلاحية ترخيص شركتك. يرجى تجديد الترخيص قبل نشر إعلانات.",
    en: "Your company license has expired. Please renew your license before publishing listings.",
  },
  "offer.error.CompanyRejected": {
    ar: "طلب تسجيل شركتك مرفوض. تواصل مع الدعم للمزيد من التفاصيل.",
    en: "Your company registration has been rejected. Please contact support for details.",
  },
  "offer.error.OfferSubmissionBlocked": {
    ar: "شركتك محظورة مؤقتاً من تقديم العروض بسبب مخالفات سابقة. تواصل مع الدعم.",
    en: "Your company is currently blocked from submitting offers due to repeated failures. Please contact support.",
  },
  "offer.error.CommercialRegistrationRequired": {
    ar: "السجل التجاري مطلوب لتقديم العروض. أضفه في ملف شركتك أولاً.",
    en: "Commercial Registration is required before submitting offers. Add it in your company profile.",
  },
  "offer.error.TermsRequired": {
    ar: "يجب قبول الشروط والأحكام خلال تسجيل الشركة قبل تقديم أي عرض.",
    en: "You must accept the Terms & Conditions during company registration before submitting offers.",
  },
  "offer.error.Forbidden": {
    ar: "لا يمكنك تقديم عرض على إعلانك الخاص.",
    en: "You cannot submit an offer on your own listing.",
  },
  "offer.error.ListingClosed": {
    ar: "هذا الإعلان مغلق ولم يعد يقبل عروضاً.",
    en: "This listing is closed and no longer accepting offers.",
  },

  /* ── UX Polish: Receipt Confirmation Dialog ── */
  "deal.receipt_dialog.producer": { ar: "المنتج (الشركة)", en: "Producer (Company)" },
  "deal.receipt_dialog.quantity": { ar: "الكمية المتوقعة", en: "Expected Quantity" },
  "deal.receipt_dialog.irreversible": { ar: "هذا الإجراء نهائي ولا يمكن التراجع عنه.", en: "This action is final and cannot be undone." },

  /* ── UX Polish: MWAN score badge in deal header ── */
  "mwan.header.score_label": { ar: "مَوَن", en: "MWAN" },

  /* ── UX Polish: What Happens Next panel ── */
  "listing.what_next.title": { ar: "ما الذي يحدث بعد ذلك؟", en: "What Happens Next?" },
  "listing.what_next.step1": { ar: "المشترون المهتمون سيرون إعلانك ويرسلون عروضاً.", en: "Interested buyers will see your listing and send offers." },
  "listing.what_next.step2": { ar: "ستصلك إشعار بكل عرض جديد ويمكنك مراجعة تفاصيله.", en: "You'll be notified of each offer and can review its details." },
  "listing.what_next.step3": { ar: "بإمكانك قبول أي عرض أو رفضه، أو إرسال عرض مضاد.", en: "You can accept, reject, or counter any offer." },
  "listing.what_next.step4": { ar: "عند قبول العرض، تُنشأ صفقة تلقائياً وتبدأ إجراءات النقل.", en: "Accepting an offer automatically creates a deal and starts transport coordination." },
  "listing.what_next.eta": { ar: "وقت الاستجابة المتوقع: 24–48 ساعة في الغالب.", en: "Typical response time: 24–48 hours." },

  /* ── UX Polish: Waste code hint in TR form ── */
  "transport.create.waste_code_hint": { ar: "يجب أن يتبع الرمز تنسيق مَوَن أو بازل، مثال: 16-01-19", en: "Code should follow MWAN or Basel format, e.g. 16-01-19" },

  /* ── Transport Responsibility (Item 2) ── */
  "listing.transport_responsibility.label": { ar: "مسؤولية النقل", en: "Transport Responsibility" },
  "listing.transport_responsibility.seller": { ar: "المورّد (البائع)", en: "Seller (Producer)" },
  "listing.transport_responsibility.buyer": { ar: "المشتري", en: "Buyer" },
  "listing.transport_responsibility.helper": {
    ar: "مسؤولية النقل تعني أن الطرف المحدد هو المسؤول عن ترتيب النقل وتحمل تكلفته.",
    en: "Transport responsibility means the selected party is responsible for arranging transportation and bearing its cost.",
  },
  "listing.transport_responsibility.form_label": { ar: "من المسؤول عن النقل؟", en: "Who is responsible for transport?" },
  "deal.transport_responsibility.label": { ar: "مسؤولية النقل", en: "Transport Responsibility" },

  /* ── VAT 15% (Item 1) ── */
  "deal.vat.subtotal": { ar: "المبلغ قبل الضريبة", en: "Subtotal (before VAT)" },
  "deal.vat.rate": { ar: "ضريبة القيمة المضافة (15%)", en: "VAT (15%)" },
  "deal.vat.total": { ar: "الإجمالي شامل الضريبة", en: "Total (incl. VAT)" },
  "deal.vat.note": { ar: "* الضريبة بنسبة 15% وفق نظام ضريبة القيمة المضافة السعودي.", en: "* VAT at 15% per Saudi VAT regulations." },
  "offer.vat.subtotal": { ar: "قيمة العرض (قبل الضريبة)", en: "Offer amount (before VAT)" },
  "offer.vat.rate": { ar: "ضريبة القيمة المضافة 15%", en: "VAT 15%" },
  "offer.vat.total": { ar: "الإجمالي شامل الضريبة", en: "Total incl. VAT" },
  "listing.vat_applicable.label": { ar: "تخضع للضريبة (15% ضريبة القيمة المضافة)", en: "VAT applicable (15% Saudi VAT)" },

  /* ── MWAN eManifest helper (Item 5) ── */
  "mwan.helper_text": {
    ar: "يتم جمع بيانات الطلب بطريقة مهيأة للتوافق مع متطلبات موان/eManifest لتقليل الإدخال المكرر مستقبلاً.",
    en: "Data is captured in a MWAN/eManifest-ready structure to reduce duplicate entry in future integrations.",
  },

  /* ── Multi-material deferred note (Item 6 — frontend only) ── */
  "listing.multi_material.deferred_note": {
    ar: "في حال وجود أكثر من نوع مادة، يرجى إنشاء قائمة مستقلة لكل مادة في نسخة MVP الحالية. سيتم دعم حزم المواد المتعددة في مرحلة لاحقة.",
    en: "For listings with multiple material types, please create separate listings for each material in this MVP. Multi-material bundled listings are planned for a later phase.",
  },

  /* ── Smart-Assist Transport clarity (Item 3) ── */
  "transport.tab.my_quotes":               { ar: "عروضي", en: "My Quotes" },
  "transport.empty.my_quotes":             { ar: "لم تقدم أي عروض أسعار بعد", en: "You haven't submitted any quotes yet" },
  "transport.quote.form_title":            { ar: "تقديم عرض سعر", en: "Submit Price Quote" },
  "transport.quote.submit_btn":            { ar: "تقديم العرض", en: "Submit Quote" },
  "transport.quote.submitting":            { ar: "جارٍ الإرسال...", en: "Submitting..." },
  "transport.quote.cancel":                { ar: "إلغاء", en: "Cancel" },
  "transport.quote.price_total":           { ar: "السعر الإجمالي (ر.س)", en: "Total Price (SAR)" },
  "transport.quote.truck_count":           { ar: "عدد الشاحنات", en: "Number of Trucks" },
  "transport.quote.truck_type":            { ar: "نوع الشاحنة", en: "Truck Type" },
  "transport.quote.truck_type.placeholder": { ar: "مثال: مغلق، مبرد، مكشوف", en: "e.g. Enclosed, Refrigerated, Flatbed" },
  "transport.quote.notes":                 { ar: "ملاحظات إضافية", en: "Additional Notes" },
  "transport.quote.success":               { ar: "تم إرسال العرض بنجاح ✓", en: "Quote submitted ✓" },
  "transport.quote.already_submitted":     { ar: "تم تقديم عرض لهذا الطلب مسبقاً", en: "You already submitted a quote for this request" },
  "transport.quote.status.submitted":      { ar: "مقدّم", en: "Submitted" },
  "transport.quote.status.under_review":   { ar: "قيد المراجعة", en: "Under Review" },
  "transport.quote.status.selected":       { ar: "مختار ✓", en: "Selected ✓" },
  "transport.quote.status.rejected":       { ar: "مرفوض", en: "Rejected" },
  "transport.quote.tr_ref":                { ar: "طلب النقل", en: "Transport Req." },
  "transport.quote.submitted_at":          { ar: "تاريخ الإرسال", en: "Submitted" },
  "admin.quotes.title":                    { ar: "عروض أسعار النقل", en: "Transport Price Quotes" },
  "admin.quotes.desc":                     { ar: "جميع العروض المقدمة من شركات النقل", en: "All quotes submitted by transporter companies" },
  "admin.quotes.load":                     { ar: "تحميل العروض", en: "Load Quotes" },
  "admin.quotes.empty":                    { ar: "لا توجد عروض نقل حالياً", en: "No transport quotes yet" },
  "admin.quotes.count":                    { ar: "{n} عرض", en: "{n} quotes" },
  "admin.quotes.select":                   { ar: "تحديد كمفضل", en: "Mark as Selected" },
  "admin.quotes.under_review":             { ar: "قيد المراجعة", en: "Under Review" },
  "admin.quotes.reject":                   { ar: "رفض", en: "Reject" },
  "admin.quotes.selecting":                { ar: "جارٍ...", en: "Updating..." },
  "admin.quotes.selection_note":           { ar: "تحديد العرض كمفضل لا يعني تعيين الناقل نهائياً. يتم التواصل والتأكيد تشغيلياً قبل التعيين.", en: "Marking a quote as selected does not automatically assign the transporter. Operational confirmation is still required." },
  "admin.quotes.price":                    { ar: "السعر", en: "Price" },
  "admin.quotes.trucks":                   { ar: "الشاحنات", en: "Trucks" },
  "admin.quotes.company":                  { ar: "الشركة الناقلة", en: "Transporter Co." },
  "admin.quotes.tr_id":                    { ar: "طلب النقل", en: "TR ID" },
  "admin.quotes.status":                   { ar: "الحالة", en: "Status" },
  "deal.transport.smart.self_managed_btn": { ar: "النقل مُرتَّب من الطرف المسؤول", en: "Transport arranged by responsible party" },
  "deal.transport.smart.self_managed_note": {
    ar: "الطرف المسؤول عن النقل سيقوم بترتيبه مباشرة دون الحاجة لوساطة المنصة.",
    en: "The responsible party will arrange transport directly without platform assistance.",
  },
  "deal.transport.smart.self_managed_status": { ar: "النقل مُرتَّب ذاتياً", en: "Self-managed transport" },
  "deal.transport.smart.options_title": { ar: "ماذا تحتاج لترتيب النقل؟", en: "How would you like to handle transport?" },
  "deal.transport.smart.option1_title": { ar: "طلب مساعدة تدويرة للنقل", en: "Request Tadweerah transport assistance" },
  "deal.transport.smart.option1_desc": { ar: "سنتواصل معك لتنسيق شاحنة مرخصة ومناسبة.", en: "We'll coordinate a licensed and appropriate vehicle for you." },
  "deal.transport.smart.option2_title": { ar: "النقل مُرتَّب من الطرف المسؤول", en: "Transport arranged by responsible party" },
  "deal.transport.smart.option2_desc": { ar: "الطرف المسؤول عن النقل سيرتبه بشكل مستقل.", en: "The responsible party will arrange transport independently." },
  "deal.transport.smart.option3_title": { ar: "لا يلزم نقل", en: "No transport required" },
  "deal.transport.smart.option3_desc": { ar: "الاستلام مباشرة أو لا حاجة لترتيب نقل.", en: "Direct pickup or no transport arrangement needed." },

  /* ── Admin email guard (Item 4) ── */
  "admin.access.denied.title": { ar: "الوصول مقيّد", en: "Access Restricted" },
  "admin.access.denied.desc": {
    ar: "هذه الصفحة مخصصة لفريق عمليات تدويرة فقط. حسابك الحالي لا يملك صلاحية الوصول.",
    en: "This page is restricted to the Tadweerah operations team. Your current account does not have access.",
  },
  "admin.stats.title": { ar: "إحصائيات المنصة", en: "Platform Analytics" },
  "admin.stats.total_companies": { ar: "إجمالي الشركات", en: "Total Companies" },
  "admin.stats.pending_companies": { ar: "شركات بانتظار الاعتماد", en: "Pending Companies" },
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
