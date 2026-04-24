import { useClerk, Show } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { LogOut, Bell } from "lucide-react";
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

  return (
    <Popover>
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
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    className={`w-full px-4 py-3 text-start transition-colors hover:bg-muted/50 ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      if (!n.is_read) markOneRead({ notificationId: n.id });
                    }}
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
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Topbar({ showSignOut = false }: { showSignOut?: boolean }) {
  const { signOut } = useClerk();
  const { t } = useT();
  const [location] = useLocation();

  const isPublicPage = location === "/" || location === "/sign-in" || location === "/sign-up" || location === "/terms";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center" aria-label={t("app.name")}>
          <img
            src={`${basePath}/logo.png`}
            alt="Tadweerah"
            className="h-12 w-auto"
          />
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Show when="signed-in">
            {!isPublicPage && <NotificationBell />}
            {showSignOut && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t("action.signout")}
              </Button>
            )}
          </Show>
        </div>
      </div>
    </header>
  );
}
