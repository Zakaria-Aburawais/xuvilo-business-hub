import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { listContactMessages } from "@/lib/adminApi";
import {
  BarChart3,
  Inbox,
  Users,
  MessageSquareQuote,
} from "lucide-react";

const NAV_ITEMS = [
  {
    path: "/admin/analytics",
    icon: BarChart3,
    en: "Analytics",
    ar: "التحليلات",
    testId: "admin-nav-analytics",
  },
  {
    path: "/admin/contact-messages",
    icon: Inbox,
    en: "Contact Inbox",
    ar: "رسائل التواصل",
    testId: "admin-nav-contact-messages",
  },
  {
    path: "/admin/newsletter-subscribers",
    icon: Users,
    en: "Subscribers",
    ar: "المشتركون",
    testId: "admin-nav-subscribers",
  },
  {
    path: "/admin/testimonials",
    icon: MessageSquareQuote,
    en: "Testimonials",
    ar: "آراء العملاء",
    testId: "admin-nav-testimonials",
  },
] as const;

const CONTACT_INBOX_PATH = "/admin/contact-messages";

export function AdminNav() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  const [location] = useLocation();
  const [followUpCount, setFollowUpCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listContactMessages({ status: "needs_follow_up", limit: 1 })
      .then((res) => {
        if (!cancelled) setFollowUpCount(res.total);
      })
      .catch(() => {
        if (!cancelled) setFollowUpCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [location]);

  return (
    <nav
      aria-label={isAR ? "صفحات الإدارة" : "Admin pages"}
      className="mb-6 flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1"
      data-testid="admin-nav"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = location === item.path;
        const isInbox = item.path === CONTACT_INBOX_PATH;
        const showBadge = isInbox && followUpCount > 0;
        const href = showBadge
          ? `${CONTACT_INBOX_PATH}?status=needs_follow_up`
          : item.path;
        return (
          <Link
            key={item.path}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60",
            )}
            aria-current={active ? "page" : undefined}
            data-testid={item.testId}
          >
            <Icon className="h-4 w-4" />
            {isAR ? item.ar : item.en}
            {showBadge && (
              <span
                className="ms-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[0.7rem] font-semibold leading-none text-white"
                aria-label={
                  isAR
                    ? `${followUpCount} رسائل تحتاج متابعة`
                    : `${followUpCount} messages need follow-up`
                }
                data-testid="admin-nav-follow-up-badge"
              >
                {followUpCount > 99 ? "99+" : followUpCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
