"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./app-sidebar";

function isActive(pathname: string, href: string, prefix?: string) {
  if (prefix === "/projects") {
    return (
      pathname === "/projects" ||
      (pathname.startsWith("/projects/") &&
        !pathname.startsWith("/projects/history"))
    );
  }
  if (prefix) return pathname === href || pathname.startsWith(prefix + "/");
  return pathname === href;
}

export function BottomNav() {
  const pathname = usePathname();
  // Bottom nav limited to 5 — top-level destinations only
  const items = NAV_ITEMS.slice(0, 5);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-800 bg-[#0E0E0E]/95 backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.matchPrefix);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              active ? "text-[#A78BFA]" : "text-gray-500"
            }`}
            style={{ minHeight: 56 }}
          >
            <Icon className="h-5 w-5" />
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
