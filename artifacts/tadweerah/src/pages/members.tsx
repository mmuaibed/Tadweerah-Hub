import { useState } from "react";
import {
  useGetCompanyMembers,
  useInviteCompanyMember,
  useRemoveCompanyMember,
  getGetCompanyMembersQueryKey,
  useGetMe,
  type CompanyMember,
} from "@workspace/api-client-react";
import {
  Loader2,
  Users,
  Trash2,
  Crown,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function MembersPage() {
  const { t, lang } = useT();
  const isRtl = lang === "ar";
  const queryClient = useQueryClient();

  const { data: me } = useGetMe();
  const { data: members = [], isLoading } = useGetCompanyMembers();

  const [inviteId, setInviteId] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<CompanyMember | null>(null);

  const myUserId = me?.userId ?? "";
  const isOwner = (members as CompanyMember[]).some(
    (m) => m.user_id === myUserId && m.role === "owner",
  );

  const { mutate: invite, isPending: inviting } = useInviteCompanyMember({
    mutation: {
      onSuccess: () => {
        setInviteId("");
        setInviteError(null);
        setInviteSuccess(true);
        setTimeout(() => setInviteSuccess(false), 3000);
        void queryClient.invalidateQueries({ queryKey: getGetCompanyMembersQueryKey() });
      },
      onError: (err: unknown) => {
        const msg =
          typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message)
            : t("members.invite.error.generic");
        setInviteError(msg);
      },
    },
  });

  const { mutate: remove, isPending: removing } = useRemoveCompanyMember({
    mutation: {
      onSuccess: () => {
        setPendingRemove(null);
        void queryClient.invalidateQueries({ queryKey: getGetCompanyMembersQueryKey() });
      },
    },
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inviteId.trim();
    if (!trimmed) {
      setInviteError(t("members.invite.error.empty"));
      return;
    }
    setInviteError(null);
    invite({ data: { user_id: trimmed } });
  }

  return (
    <AppLayout showSignOut>
      <div className="mx-auto max-w-2xl space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-foreground">{t("members.title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t("members.subtitle")}</p>
        </div>

        {/* Invite form — owner only */}
        {isOwner && (
          <div className="rounded-xl border border-card-border bg-card p-5">
            <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              {t("members.invite.title")}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">{t("members.invite.hint")}</p>
            <form onSubmit={handleInvite} className="flex gap-2" dir={isRtl ? "rtl" : "ltr"}>
              <Input
                value={inviteId}
                onChange={(e) => { setInviteId(e.target.value); setInviteError(null); }}
                placeholder={t("members.invite.placeholder")}
                className="flex-1"
                disabled={inviting}
              />
              <Button type="submit" disabled={inviting || !inviteId.trim()} size="sm">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("members.invite.cta")}
              </Button>
            </form>
            {inviteError && (
              <p className="mt-2 text-xs text-destructive">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                {t("members.invite.success")}
              </p>
            )}
          </div>
        )}

        {/* Members list */}
        <div className="rounded-xl border border-card-border bg-card divide-y divide-border">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (members as CompanyMember[]).length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("members.empty")}</p>
          ) : (
            (members as CompanyMember[]).map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between gap-3 px-5 py-4"
                dir={isRtl ? "rtl" : "ltr"}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "owner" ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"}`}>
                    {m.role === "owner"
                      ? <Crown className="h-4 w-4" />
                      : <Users className="h-4 w-4" />
                    }
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate font-mono">{m.user_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`members.role.${m.role}`)}
                      {m.user_id === myUserId && (
                        <span className="ms-1 text-primary">({t("members.role.you")})</span>
                      )}
                    </p>
                  </div>
                </div>
                {isOwner && m.role !== "owner" && m.user_id !== myUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => setPendingRemove(m)}
                    disabled={removing}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Remove confirm */}
      {pendingRemove && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setPendingRemove(null); }}
          title={t("members.remove.confirm.title")}
          description={t("members.remove.confirm.desc")}
          confirmLabel={t("members.remove.cta")}
          destructive
          onConfirm={() => remove({ userId: pendingRemove.user_id })}
        />
      )}
    </AppLayout>
  );
}
