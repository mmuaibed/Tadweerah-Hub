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

      {/* Printable A4 Canvas */}
      <div className="flex-1 p-6 print:p-0 flex justify-center">
        <div className="w-full max-w-4xl bg-white shadow-xl print:shadow-none print:max-w-none print:w-full border border-gray-200 print:border-none rounded-lg print:rounded-none overflow-hidden"
             style={{ minHeight: "297mm", padding: "15mm" }}>
             
          {/* Header */}
          <header className="flex justify-between items-start mb-12 border-b-2 border-primary/20 pb-8">
            <div className="flex flex-col">
              <img src="/logo.svg" alt="Tadweerah" className="h-12 w-auto mb-6 opacity-90 object-contain self-start" />
              <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                {isAr 
                  ? `تقرير الاستدامة لشركة ${row.processor_name || 'المعالج'} عبر منصة تدويرة` 
                  : `Sustainability Report for ${row.processor_name || 'Processor'} via Tadweerah`
                }
              </h1>
              <div className="flex flex-col gap-1 text-sm text-gray-600 font-mono mt-4">
                <span>{isAr ? "المرجع التجاري:" : "Commercial Ref:"} {row.commercial_ref}</span>
                <span>{isAr ? "تاريخ الاعتماد:" : "Finalized Date:"} {finalizedDate}</span>
                <span>{isAr ? "تاريخ الإصدار:" : "Generated Date:"} {generatedDate}</span>
              </div>
            </div>

            {/* Processor Logo Slot / Placeholder */}
            <div className="shrink-0 pt-2 ms-6">
              <div className="w-48 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50/50 p-4 text-center">
                <span className="text-sm font-semibold text-gray-400 break-words line-clamp-3">
                  {row.processor_name || (isAr ? "شعار الشركة" : "Company Logo")}
                </span>
              </div>
            </div>
          </header>

          {/* Core Summary Grid */}
          <section className="mb-12">
            <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-200 pb-2">
              {isAr ? "ملخص بيانات المصدر" : "Source Data Summary"}
            </h2>
            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {isAr ? "المشتري / المعالج" : "Buyer / Processor"}
                </span>
                <span className="text-base font-medium text-gray-900">{row.processor_name || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {isAr ? "البائع / المصدر" : "Seller / Source Counterparty"}
                </span>
                <span className="text-base font-medium text-gray-900">{row.seller_id === row.buyer_id ? "—" : row.counterparty_name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {isAr ? "نوع المصدر" : "Source Type"}
                </span>
                <span className="text-base font-medium text-gray-900">
                  {row.source_type === "deal" ? (isAr ? "صفقة" : "Deal") : row.source_type === "contract_shipment" ? (isAr ? "شحنة" : "Shipment") : row.source_type}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {isAr ? "المادة" : "Material"}
                </span>
                <span className="text-base font-medium text-gray-900">{isAr ? row.material_ar : row.material_en}</span>
              </div>
              <div className="flex flex-col col-span-2 bg-primary/5 rounded-lg p-5 border border-primary/10 mt-2">
                <span className="text-sm font-bold text-primary uppercase tracking-wider mb-1">
                  {isAr ? "إجمالي الكمية المستدامة المعتمدة" : "Total Finalized Sustainability Quantity"}
                </span>
                <span className="text-3xl font-black text-gray-900 font-mono">
                  {Number(row.quantity).toLocaleString("en-US")} {row.unit === "ton" ? (isAr ? "طن" : "ton") : row.unit === "kg" ? (isAr ? "كجم" : "kg") : row.unit}
                </span>
              </div>
            </div>
          </section>

          {/* Pathway Breakdown */}
          <section className="mb-12 break-inside-avoid">
            <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-200 pb-2">
              {isAr ? "مسارات الاستدامة" : "Sustainability Pathways"}
            </h2>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-start text-sm font-bold text-gray-700">
                      {isAr ? "المسار" : "Pathway"}
                    </th>
                    <th scope="col" className="px-6 py-4 text-start text-sm font-bold text-gray-700">
                      {isAr ? "الكمية" : "Quantity"}
                    </th>
                    <th scope="col" className="px-6 py-4 text-start text-sm font-bold text-gray-700">
                      {isAr ? "النسبة" : "Percentage"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {row.pathways.map((pw: any, idx: number) => {
                    const unitStr = row.unit === "ton" ? (isAr ? "طن" : "ton") : row.unit === "kg" ? (isAr ? "كجم" : "kg") : row.unit;
                    return (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {isAr ? pw.pathway_name_ar : pw.pathway_name_en}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                          {Number(pw.quantity).toLocaleString("en-US")} {unitStr}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                          {pw.percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer Disclaimer */}
          <footer className="mt-16 pt-8 border-t-2 border-gray-200 text-xs leading-relaxed text-gray-500 break-inside-avoid">
            <p className="mb-2 font-medium text-gray-600 uppercase tracking-widest text-[10px]">
              {isAr ? "إخلاء مسؤولية / Disclaimer" : "Disclaimer"}
            </p>
            <p className="mb-3 text-justify">
              {isAr 
                ? "يعرض هذا التقرير بيانات الاستدامة المسجلة والمعتمدة داخل منصة تدويرة بناءً على معلومات العمليات المتاحة في المنصة. لا يمثل هذا التقرير شهادة اعتماد أو تحققاً مستقلاً أو حساباً لانبعاثات الكربون."
                : "This report summarizes finalized sustainability data recorded within Tadweerah based on platform transaction data. It is not a certificate, independent verification, or carbon emissions calculation."}
            </p>
            <p className="text-center mt-8 text-gray-400 font-mono">
              tadweerah.com
            </p>
          </footer>

        </div>
      </div>
    </div>
  );
}
