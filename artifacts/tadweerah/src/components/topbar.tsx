import { useClerk, Show, useUser } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { LogOut, Bell, MessageSquareWarning, ShieldCheck, Home } from "lucide-react";
import { useState } from "react";
import { ReportIssueModal } from "@/components/report-issue-modal";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/i18n";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useGetNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getGetNotificationsQueryKey,
  type Notification,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function NotificationBell() {
  const { t, lang } = useT();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  const { data: unreadData = [] } = useGetNotifications({ unread: true });
  const { data: allData = [] } = useGetNotifications({});

  const unreadCount = (unreadData as Notification[]).length;
  const notifications = (allData as Notification[]).slice(0, 8);

  const { mutate: markAllRead } = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      },
    },
  });

  const { mutate: markOneRead } = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      },
    },
  });

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) markOneRead({ notificationId: n.id });
    if (n.related_entity_type === "listing" && n.related_entity_id) {
      setOpen(false);
      navigate(`/listings/${n.related_entity_id}`);
    } else if (n.related_entity_type === "contract" && n.related_entity_id) {
      setOpen(false);
      navigate(`/contracts/${n.related_entity_id}`);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={t("notification.bell.label")}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            {t("notification.title")}
            {unreadCount > 0 && (
              <span className="ms-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-xs text-primary hover:underline"
            >
              {t("notification.mark_all_read")}
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("notification.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const isNavigable = (n.related_entity_type === "listing" || n.related_entity_type === "contract") && !!n.related_entity_id;
                return (
                  <li key={n.id}>
                    <button
                      className={`w-full px-4 py-3 text-start transition-colors hover:bg-muted/50 ${
                        !n.is_read ? "bg-primary/5" : ""
                      } ${isNavigable ? "cursor-pointer" : ""}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <p className={`text-sm leading-snug ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {lang === "ar" ? n.title_ar : n.title_en}
                      </p>
                      {(n.body_ar ?? n.body_en) && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {lang === "ar" ? (n.body_ar ?? n.body_en) : (n.body_en ?? n.body_ar)}
                        </p>
                      )}
                      {!n.is_read && (
                        <span className="mt-1 inline-block text-xs text-primary">
                          {t("notification.unread")}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Topbar({ showSignOut = false }: { showSignOut?: boolean }) {
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const { t, lang } = useT();
  const [location] = useLocation();
  const [reportOpen, setReportOpen] = useState(false);

  const isPublicPage = location === "/" || location === "/sign-in" || location === "/sign-up" || location === "/terms";

  const adminAllowlist = ((import.meta.env.VITE_TADWEERAH_ADMIN_EMAILS as string | undefined) ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const isAdmin = isLoaded && adminAllowlist.length > 0 && adminAllowlist.includes(userEmail);

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="-mx-2 flex items-center rounded-xl px-2 py-1.5 transition-opacity hover:opacity-70 active:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={t("app.name")}
          title={lang === "ar" ? "العودة إلى الصفحة الرئيسية" : "Return to Home"}
        >
          <img
            src={`${basePath}/logo.png`}
            alt="Tadweerah"
            className="h-14 w-auto object-contain"
            style={{ maxHeight: "56px", width: "auto" }}
          />
        </Link>

        {/* Brand slogan — centered, home page only, large screens only */}
        {location === "/" && (
          <span className="pointer-events-none absolute inset-0 hidden items-center justify-center lg:flex">
            <span className="text-sm font-semibold tracking-wide text-secondary select-none">
              {t("home.subheadline")}
            </span>
          </span>
        )}

        <div className="flex items-center gap-2">
          <a
            href="mailto:info@tadweerah.com"
            className="hidden sm:inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            {t("support.label")}
          </a>
          <LanguageToggle />
          <Show when="signed-in">
            {!isPublicPage && (
              <>
                <Link to="/">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex gap-1.5 text-muted-foreground hover:text-foreground px-2 h-9 mr-1" 
                    title={lang === "ar" ? "العودة إلى الصفحة الرئيسية" : "Return to Home"}
                  >
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">{lang === "ar" ? "الرئيسية" : "Home"}</span>
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5 text-primary border-primary/20 hover:bg-primary/5 mr-2">
                      <ShieldCheck className="h-4 w-4" />
                      {lang === "ar" ? "لوحة الأدمن" : "Admin Panel"}
                    </Button>
                  </Link>
                )}
                <button
                  aria-label={t("report.button")}
                  title={t("report.button")}
                  onClick={() => setReportOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-amber-600 focus:outline-none"
                >
                  <MessageSquareWarning className="h-5 w-5" />
                </button>
                <NotificationBell />
              </>
            )}
            {showSignOut && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                className="gap-2"
                title={t("action.signout")}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t("action.signout")}</span>
              </Button>
            )}
          </Show>
        </div>
      </div>
    </header>
    <ReportIssueModal open={reportOpen} onOpenChange={setReportOpen} />
    </>
  );
}
