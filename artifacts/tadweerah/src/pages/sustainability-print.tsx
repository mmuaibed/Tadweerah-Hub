import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Loader2, Printer, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import React from "react";

export function SustainabilityPrintPage() {
  const [, params] = useRoute("/reports/sustainability/:id/print");
  const id = params?.id;
  const { lang, t } = useT();
  const isAr = lang === "ar";
  const { getToken } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["sustainability-report-detail", id],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/reports/sustainability/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load");
      return await res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data || !data.row) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-white p-4">
        <p className="text-destructive mb-4">{isAr ? "حدث خطأ أثناء تحميل التقرير." : "Error loading report."}</p>
        <Button onClick={() => window.history.back()}>
          {isAr ? "الرجوع" : "Go Back"}
        </Button>
      </div>
    );
  }

  const { row } = data;
  
  // Format the date
  const generatedDate = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'long' });
  const finalizedDate = row.finalized_at ? new Date(row.finalized_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'long' }) : "—";
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black print:bg-white flex flex-col font-sans" dir={isAr ? "rtl" : "ltr"}>
      {/* Non-printable Control Bar */}
      <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => window.history.back()} className="gap-2 text-gray-700">
              {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {isAr ? "رجوع" : "Back"}
            </Button>
            <h1 className="text-lg font-semibold text-gray-800">
              {isAr ? "معاينة الطباعة" : "Print Preview"}
            </h1>
          </div>
          <Button onClick={handlePrint} className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm">
            <Printer className="w-4 h-4" />
            {isAr ? "طباعة التقرير / Print" : "Print Report"}
          </Button>
        </div>
      </div>

      {/* Printable Canvas */}
      <div className="flex-1 p-6 print:p-0 flex justify-center print:block">
        <div className="w-full max-w-4xl bg-white shadow-xl print:shadow-none print:max-w-none print:w-full border border-gray-200 print:border-none rounded-lg print:rounded-none overflow-hidden print:p-8">
             
          {/* Header */}
          <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            {/* Right Side (Arabic start) - Tadweerah Logo */}
            <div className="flex flex-col">
              <img src="/logo.png" alt="Tadweerah" className="h-8 w-auto object-contain" />
            </div>

            {/* Left Side (Arabic end) - Processor Card */}
            <div className="shrink-0 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 min-w-[200px]">
              {row.processor_logo_url && (
                <img
                  src={row.processor_logo_url}
                  alt={row.processor_name || ""}
                  className="h-8 w-8 object-contain shrink-0 rounded"
                  crossOrigin="anonymous"
                />
              )}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  {isAr ? "المعالج / Processor" : "Processor"}
                </span>
                <span className="text-sm font-bold text-gray-900 leading-tight">
                  {row.processor_name || "—"}
                </span>
              </div>
            </div>
          </header>

          {/* Title Block */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">
              {isAr ? "تقرير الاستدامة" : "Sustainability Report"}
            </h1>
            <h2 className="text-base font-medium text-gray-700 mb-0.5">
              {isAr ? `لشركة ${row.processor_name || 'المعالج'} عبر منصة تدويرة` : `For ${row.processor_name || 'Processor'} via Tadweerah`}
            </h2>
            <h3 className="text-xs font-normal text-gray-500">
              {isAr ? `تقرير الاستدامة لشركة ${row.processor_name || 'المعالج'} عبر منصة تدويرة` : `Sustainability Report for ${row.processor_name || 'Processor'} via Tadweerah`}
            </h3>
          </div>

          {/* SIR-2D: Superseded / version label */}
          {row.status === "superseded" && (
            <div className="flex justify-center mb-4 print:mb-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-600 print:text-gray-500">
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isAr
                  ? `النسخة ${row.version ?? 1} — مُستبدَلة`
                  : `Version ${row.version ?? 1} — Superseded`}
              </span>
            </div>
          )}

          {/* Core Summary Grid */}
          <section className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{isAr ? "المرجع التجاري" : "Commercial Ref"}</span>
                  <span className="text-sm font-medium text-gray-900 font-mono" dir="ltr" style={{ unicodeBidi: "isolate", textAlign: isAr ? "right" : "left" }}>{row.commercial_ref}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{isAr ? "نوع المصدر" : "Source Type"}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {row.source_type === "deal" ? (isAr ? "صفقة" : "Deal") : row.source_type === "contract_shipment" ? (isAr ? "شحنة" : "Shipment") : row.source_type}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{isAr ? "تاريخ الاعتماد" : "Finalized Date"}</span>
                  <span className="text-sm font-medium text-gray-900">{finalizedDate}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{isAr ? "تاريخ الإصدار" : "Generated Date"}</span>
                  <span className="text-sm font-medium text-gray-900">{generatedDate}</span>
                </div>
              </div>
              
              {/* Entities Cards */}
              <div className="grid grid-cols-1 gap-3 bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{isAr ? "المعالج" : "Processor"}</span>
                  <span className="text-sm font-medium text-gray-900">{row.processor_name || "—"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{isAr ? "البائع / المصدر" : "Seller / Source Counterparty"}</span>
                  <span className="text-sm font-medium text-gray-900">{row.seller_id === row.buyer_id ? "—" : row.counterparty_name}</span>
                </div>
              </div>

              {/* Material & Quantity */}
              <div className="flex flex-col bg-gray-50 rounded-lg p-4 border border-gray-100 justify-center">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{isAr ? "المادة" : "Material"}</span>
                <span className="text-base font-bold text-gray-900">{isAr ? row.material_ar : row.material_en}</span>
              </div>
              <div className="flex flex-col bg-primary/5 rounded-lg p-4 border border-primary/20 items-center justify-center text-center">
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">
                  {isAr ? "الكمية المستدامة المعتمدة" : "Finalized Sustainability Qty"}
                </span>
                <span className="text-xl font-black text-gray-900 font-mono" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                  {Number(row.quantity).toLocaleString("en-US")} {row.unit === "ton" ? (isAr ? "طن" : "ton") : row.unit === "kg" ? (isAr ? "كجم" : "kg") : row.unit}
                </span>
              </div>
            </div>
          </section>

          {/* Pathway Breakdown */}
          <section className="mb-6 break-inside-avoid">
            <h2 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              {isAr ? "مسارات الاستدامة" : "Sustainability Pathways"}
            </h2>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-bold text-gray-500">
                      {isAr ? "المسار" : "Pathway"}
                    </th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-bold text-gray-500 w-1/4">
                      {isAr ? "الكمية" : "Quantity"}
                    </th>
                    <th scope="col" className="px-4 py-2 text-start text-xs font-bold text-gray-500 w-1/4">
                      {isAr ? "النسبة" : "Percentage"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {row.pathways?.length > 0 ? (
                    row.pathways.map((pw: any, idx: number) => {
                      const unitStr = row.unit === "ton" ? (isAr ? "طن" : "ton") : row.unit === "kg" ? (isAr ? "كجم" : "kg") : row.unit;
                      const percentage = Number(pw.percentage || 0);
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 align-middle">
                            {isAr ? pw.pathway_name_ar : pw.pathway_name_en}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 font-mono align-middle">
                            <span dir="ltr" style={{ unicodeBidi: "isolate" }}>{Number(pw.quantity).toLocaleString("en-US")} {unitStr}</span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="font-mono w-8 text-end" dir="ltr" style={{ unicodeBidi: "isolate" }}>{percentage}%</span>
                              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden print:bg-gray-100">
                                <div className="h-full bg-primary print:bg-gray-800 rounded-full print:exact-colors" style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">
                        {isAr ? "لا توجد مسارات مسجلة" : "No pathways recorded"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer Disclaimer */}
          <footer className="mt-auto pt-4 border-t border-gray-200 text-[9px] leading-relaxed text-gray-500 break-inside-avoid">
            <div className="flex flex-col gap-1.5">
              <p className="text-justify">
                <span className="font-bold text-gray-700 me-1">{isAr ? "إخلاء مسؤولية:" : "Disclaimer:"}</span>
                {isAr 
                  ? "يعرض هذا التقرير بيانات الاستدامة المسجلة والمعتمدة داخل منصة تدويرة بناءً على معلومات العمليات المتاحة في المنصة. لا يمثل هذا التقرير شهادة اعتماد أو تحققاً مستقلاً أو حساباً لانبعاثات الكربون."
                  : "This report summarizes finalized sustainability data recorded within Tadweerah based on platform transaction data. It is not a certificate, independent verification, or carbon emissions calculation."}
              </p>
              <div className="flex justify-between items-center text-gray-400 font-mono pt-1.5 mt-1 border-t border-gray-100">
                <span dir="ltr" style={{ unicodeBidi: "isolate" }}>Ref: {row.commercial_ref}</span>
                <span>tadweerah.com</span>
              </div>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}
