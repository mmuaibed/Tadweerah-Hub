import { useState } from "react";
import { useAuth } from "@clerk/react";
import { MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ReportIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportIssueModal({ open, onOpenChange }: ReportIssueModalProps) {
  const { getToken } = useAuth();
  const { t } = useT();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit() {
    if (message.trim().length < 5) return;
    setStatus("sending");
    try {
      const token = await getToken();
      const res = await fetch(`${basePath}/api/issue-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  function handleOpenChange(val: boolean) {
    if (!val) {
      setMessage("");
      setStatus("idle");
    }
    onOpenChange(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5 text-amber-500" />
            {t("report.modal.title")}
          </DialogTitle>
          <DialogDescription>{t("report.modal.description")}</DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div className="rounded-lg bg-green-50 px-4 py-6 text-center">
            <p className="font-medium text-green-700">{t("report.modal.success")}</p>
          </div>
        ) : (
          <>
            <Textarea
              rows={5}
              placeholder={t("report.modal.placeholder")}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              disabled={status === "sending"}
              className="resize-none"
              maxLength={2000}
            />
            {status === "error" && (
              <p className="text-sm text-destructive">{t("report.modal.error")}</p>
            )}
            {message.trim().length > 0 && message.trim().length < 5 && (
              <p className="text-xs text-muted-foreground">{t("report.modal.min_length")}</p>
            )}
          </>
        )}

        <DialogFooter>
          {status === "success" ? (
            <Button onClick={() => handleOpenChange(false)}>
              {t("action.close")}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={status === "sending"}
              >
                {t("action.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={status === "sending" || message.trim().length < 5}
              >
                {status === "sending"
                  ? t("report.modal.sending")
                  : t("report.modal.submit")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
