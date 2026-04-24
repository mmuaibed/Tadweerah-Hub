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
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/confirm-dialog";

function truncateUserId(id: string): string {
  if (id.length <= 20) return id;
  return `${id.slice(0, 12)}…${id.slice(-6)}`;
}

function MemberRow({
  member,
  isSelf,
  canRemove,
  onRemove,
  removing,
}: {
  member: CompanyMember;
  isSelf: boolean;
  canRemove: boolean;
  onRemove: () => void;
  removing: boolean;
}) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(member.user_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          member.role === "owner" ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
        }`}>
          {member.role === "owner"
            ? <Crown className="h-4 w-4" />
            : <Users className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground font-mono" dir="ltr">
              {truncateUserId(member.user_id)}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
              title={copied ? t("members.userId.copied") : t("members.userId.label")}
            >
              {copied
                ? <Check className="h-3 w-3 text-emerald-500" />
                : <Copy className="h-3 w-3" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(`members.role.${member.role}`)}
            {isSelf && (
              <span className="ms-1 text-primary">({t("members.role.you")})</span>
            )}
          </p>
        </div>
      </div>
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive shrink-0"
          onClick={onRemove}
          disabled={removing}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

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
  const [removeError, setRemoveError] = useState<string | null>(null);

  const myUserId = me?.userId ?? "";
  const allMembers = members as CompanyMember[];
  const isOwner = allMembers.some((m) => m.user_id === myUserId && m.role === "owner");

  const ownerRow = allMembers.find((m) => m.role === "owner");
  const memberRows = allMembers.filter((m) => m.role !== "owner");

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
        setRemoveError(null);
        void queryClient.invalidateQueries({ queryKey: getGetCompanyMembersQueryKey() });
      },
      onError: (err: unknown) => {
        setPendingRemove(null);
        const msg =
          typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message)
            : t("members.remove.error.generic");
        setRemoveError(msg);
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
                className="flex-1 font-mono text-sm"
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

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Owner section */}
            {ownerRow && (
              <div className="rounded-xl border border-card-border bg-card overflow-hidden">
                <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5" />
                    {t("members.section.owner")}
                  </p>
                  <p className="text-xs text-amber-600/80 mt-0.5">{t("members.role.owner.desc")}</p>
                </div>
                <MemberRow
                  member={ownerRow}
                  isSelf={ownerRow.user_id === myUserId}
                  canRemove={false}
                  onRemove={() => {}}
                  removing={false}
                />
              </div>
            )}

            {/* Members section */}
            <div className="rounded-xl border border-card-border bg-card overflow-hidden">
              <div className="px-5 py-2.5 bg-muted/30 border-b border-border">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {t("members.section.members")}
                  </p>
                  {memberRows.length > 0 && (
                    <span className="text-xs text-muted-foreground">{memberRows.length}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/80 mt-0.5">{t("members.role.member.desc")}</p>
              </div>
              {memberRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("members.noMembers")}
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {memberRows.map((m) => (
                    <MemberRow
                      key={m.user_id}
                      member={m}
                      isSelf={m.user_id === myUserId}
                      canRemove={isOwner && m.user_id !== myUserId}
                      onRemove={() => setPendingRemove(m)}
                      removing={removing}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Remove confirm */}
      {removeError && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {removeError}
        </div>
      )}

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
