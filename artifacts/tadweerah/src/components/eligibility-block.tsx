import { AlertCircle, Info, ShieldAlert } from "lucide-react";
import type { EligibilityDecision } from "@/hooks/use-eligibility";

interface EligibilityBlockProps {
  decision: EligibilityDecision;
}

const SEVERITY_STYLES = {
  info:    { border: "border-blue-200",    bg: "bg-blue-50",    text: "text-blue-700",    iconCls: "text-blue-500",    Icon: Info },
  warning: { border: "border-amber-200",   bg: "bg-amber-50",   text: "text-amber-700",   iconCls: "text-amber-500",   Icon: AlertCircle },
  error:   { border: "border-red-200",     bg: "bg-red-50",     text: "text-red-700",     iconCls: "text-red-500",     Icon: ShieldAlert },
};

/**
 * Renders a contextual banner when a company is blocked from submitting an offer.
 * Receives a fully-resolved `EligibilityDecision` from `useEligibility()`.
 */
export function EligibilityBlock({ decision }: EligibilityBlockProps) {
  if (decision.allowed || !decision.reason) return null;

  const style = SEVERITY_STYLES[decision.severity ?? "info"];
  const { Icon } = style;

  return (
    <div className={`rounded-lg border p-4 space-y-1.5 ${style.border} ${style.bg}`}>
      <div className={`flex items-center gap-2 font-semibold text-sm ${style.text}`}>
        <Icon className={`h-4 w-4 shrink-0 ${style.iconCls}`} />
        {decision.title}
      </div>
      {decision.message && (
        <p className={`text-xs leading-relaxed ${style.text} opacity-80`}>
          {decision.message}
        </p>
      )}
    </div>
  );
}
