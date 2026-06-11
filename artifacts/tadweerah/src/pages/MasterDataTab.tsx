import { useState, useEffect } from "react";
import { Loader2, RefreshCw, AlertCircle, ShieldAlert, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";

export interface MasterDataTabProps {
  adminKey: string;
  callAdmin: (path: string, options?: RequestInit) => Promise<Response>;
}

export function MasterDataTab({ adminKey, callAdmin }: MasterDataTabProps) {
  const { lang } = useT();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [materialCategories, setMaterialCategories] = useState<any[] | null>(null);
  const [unitOptions, setUnitOptions] = useState<any[] | null>(null);
  const [companyCategories, setCompanyCategories] = useState<any[] | null>(null);
  const [capabilities, setCapabilities] = useState<any[] | null>(null);

  async function fetchAll() {
    if (!adminKey.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const [matRes, unitRes, compRes, capRes] = await Promise.all([
        callAdmin("/lookup/material-categories"),
        callAdmin("/lookup/unit-options"),
        callAdmin("/lookup/company-categories"),
        callAdmin("/lookup/capabilities"),
      ]);

      if (!matRes.ok) throw new Error(`HTTP ${matRes.status} on material-categories`);
      if (!unitRes.ok) throw new Error(`HTTP ${unitRes.status} on unit-options`);
      if (!compRes.ok) throw new Error(`HTTP ${compRes.status} on company-categories`);
      if (!capRes.ok) throw new Error(`HTTP ${capRes.status} on capabilities`);

      setMaterialCategories(await matRes.json());
      setUnitOptions(await unitRes.json());
      setCompanyCategories(await compRes.json());
      setCapabilities(await capRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error fetching master data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAll();
  }, [adminKey]);

  function renderStatus(isActive: boolean) {
    if (isActive) {
      return <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-700">{lang === "ar" ? "نشط" : "Active"}</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px]">{lang === "ar" ? "معطل" : "Inactive"}</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {lang === "ar" ? "إدارة القوائم" : "Master Data"}
        </h2>
        <Button onClick={() => void fetchAll()} disabled={loading} variant="outline" size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 me-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 me-2" />
          )}
          {lang === "ar" ? "تحديث البيانات" : "Refresh"}
        </Button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <p>
          {lang === "ar" 
            ? "إدارة القوائم المنسدلة المستخدمة في المنصة مع الحفاظ على سلامة السجلات السابقة. لا يتم حذف الخيارات نهائياً حفاظاً على سلامة السجلات السابقة، ويتم تقييد القوائم الحساسة وفق قواعد الحوكمة." 
            : "Manage dropdown lists used in the platform while preserving historical records. Options are never permanently deleted, and sensitive lists are restricted according to governance rules."}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {loading && !materialCategories && (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!loading && materialCategories && (
        <div className="space-y-8">
          
          {/* Editable Lists Section */}
          <div className="space-y-4">
            <h3 className="text-md font-bold flex items-center gap-2 text-foreground">
              {lang === "ar" ? "القوائم القابلة للتعديل" : "Editable Lists"}
              <Badge variant="outline" className="text-[10px] font-normal">{lang === "ar" ? "قابلة للتعديل" : "Editable"}</Badge>
            </h3>

            {/* Material Categories */}
            <div className="rounded-xl border border-border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/10">
                <p className="text-sm font-semibold text-foreground">{lang === "ar" ? "تصنيفات المواد" : "Material Categories"}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المعرف الداخلي" : "Key"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الاسم العربي" : "Arabic Name"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الاسم الإنجليزي" : "English Name"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "التصنيف الرئيسي" : "Parent Category"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {materialCategories.map((item) => (
                      <tr key={item.key} className="hover:bg-muted/10">
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{item.key}</td>
                        <td className="px-4 py-2 font-medium">{item.name_ar}</td>
                        <td className="px-4 py-2" dir="ltr">{item.name_en}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {item.parent_category ? (
                            <Badge variant="outline" className="text-[10px] bg-muted/50">{item.parent_category}</Badge>
                          ) : (
                            <span className="text-[10px] font-semibold text-primary/70">{lang === "ar" ? "رئيسي" : "Parent"}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">{renderStatus(item.is_active)}</td>
                      </tr>
                    ))}
                    {materialCategories.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{lang === "ar" ? "لا توجد بيانات" : "No data"}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unit Options */}
            <div className="rounded-xl border border-border bg-white overflow-hidden mt-4">
              <div className="px-4 py-3 border-b border-border bg-muted/10">
                <p className="text-sm font-semibold text-foreground">{lang === "ar" ? "وحدات القياس" : "Unit Options"}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المعرف الداخلي" : "Key"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الاسم العربي" : "Arabic Label"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الاسم الإنجليزي" : "English Label"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الرمز" : "Symbol"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "ترتيب الظهور" : "Sort Order"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unitOptions?.map((item) => (
                      <tr key={item.key} className="hover:bg-muted/10">
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{item.key}</td>
                        <td className="px-4 py-2 font-medium">{item.label_ar}</td>
                        <td className="px-4 py-2" dir="ltr">{item.label_en}</td>
                        <td className="px-4 py-2 font-semibold text-primary">{item.symbol || "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">{item.sort_order}</td>
                        <td className="px-4 py-2">{renderStatus(item.is_active)}</td>
                      </tr>
                    ))}
                    {(!unitOptions || unitOptions.length === 0) && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{lang === "ar" ? "لا توجد بيانات" : "No data"}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Governed Lists Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-md font-bold flex items-center gap-2 text-amber-700">
              {lang === "ar" ? "القوائم المحكومة" : "Governed Lists"}
              <Badge variant="outline" className="text-[10px] font-normal border-amber-200 text-amber-700 bg-amber-50">{lang === "ar" ? "محكومة" : "Governed"}</Badge>
            </h3>

            {/* Company Categories */}
            <div className="rounded-xl border border-amber-200 bg-white overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">{lang === "ar" ? "تصنيفات الشركات" : "Company Categories"}</p>
                    <p className="text-xs text-amber-700 mt-1">
                      {lang === "ar" ? "⚠️ تعديل هذه القائمة قد يؤثر على تصنيف الشركات القائمة. تأكد من مراجعة السجلات المرتبطة قبل إجراء أي تغيير." : "⚠️ Modifying this list may affect existing company classifications. Review related records before making any changes."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المعرف الداخلي" : "Key"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الاسم العربي" : "Arabic Name"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الاسم الإنجليزي" : "English Name"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {companyCategories?.map((item) => (
                      <tr key={item.key} className="hover:bg-muted/10">
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{item.key}</td>
                        <td className="px-4 py-2 font-medium">{item.name_ar}</td>
                        <td className="px-4 py-2" dir="ltr">{item.name_en}</td>
                        <td className="px-4 py-2">{renderStatus(item.is_active)}</td>
                      </tr>
                    ))}
                    {(!companyCategories || companyCategories.length === 0) && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">{lang === "ar" ? "لا توجد بيانات" : "No data"}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Read-Only Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-md font-bold flex items-center gap-2 text-slate-700">
              {lang === "ar" ? "للعرض فقط" : "Read-Only"}
              <Badge variant="outline" className="text-[10px] font-normal bg-slate-100 text-slate-600">{lang === "ar" ? "للعرض فقط" : "Read-Only"}</Badge>
            </h3>

            {/* Capabilities */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-start gap-2">
                  <Lock className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{lang === "ar" ? "القدرات التشغيلية" : "Capabilities"}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {lang === "ar" ? "القدرات التشغيلية — للعرض فقط. التعديل يتطلب مراجعة تقنية." : "Operational capabilities — read-only. Modification requires technical review."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "المعرف الداخلي" : "Key"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الاسم العربي" : "Arabic Name"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الاسم الإنجليزي" : "English Name"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "يتطلب ترخيص" : "Requires License"}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{lang === "ar" ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {capabilities?.map((item) => (
                      <tr key={item.key} className="hover:bg-muted/10">
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{item.key}</td>
                        <td className="px-4 py-2 font-medium">{item.name_ar}</td>
                        <td className="px-4 py-2" dir="ltr">{item.name_en}</td>
                        <td className="px-4 py-2">
                          {item.requires_license ? (
                            <span className="text-amber-700 text-xs font-semibold">{lang === "ar" ? "نعم" : "Yes"}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">{lang === "ar" ? "لا" : "No"}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">{renderStatus(item.is_active)}</td>
                      </tr>
                    ))}
                    {(!capabilities || capabilities.length === 0) && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{lang === "ar" ? "لا توجد بيانات" : "No data"}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
