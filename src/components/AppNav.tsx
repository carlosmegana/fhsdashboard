"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";

// The four time-horizon pages. Each one is a route; the nav highlights the
// current one from the pathname.
const PAGES = [
  { href: "/", label: "Daily" },
  { href: "/weekly", label: "Weekly" },
  { href: "/monthly", label: "Monthly" },
  { href: "/yearly", label: "Yearly" },
] as const;

export default function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-paper">
      {/*
        One row on desktop: brand · tabs · actions. On phones the tabs wrap to
        their own full-width row under the brand so nothing gets squeezed.
      */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center px-4 md:px-6">
        <Link
          href="/"
          className="mr-4 shrink-0 py-3 text-sm font-semibold tracking-tight text-ink"
        >
          Flow Habit System
        </Link>

        <nav
          aria-label="Pages"
          className="-mb-px order-3 flex w-full gap-1 overflow-x-auto md:order-2 md:w-auto md:flex-1"
        >
          {PAGES.map((page) => {
            const active = pathname === page.href;
            return (
              <Link
                key={page.href}
                href={page.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 border-b-2 px-2.5 py-3 text-sm transition-colors ${
                  active
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-3 hover:text-ink"
                }`}
              >
                {page.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-1 md:order-3">
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                pathname === "/admin"
                  ? "bg-paper-2 text-ink"
                  : "text-ink-3 hover:bg-paper-2 hover:text-ink"
              }`}
            >
              Admin
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md px-2.5 py-1.5 text-sm text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
            >
              Cerrar sesion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
