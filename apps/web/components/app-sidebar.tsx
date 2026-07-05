"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { removeToken } from "@/lib/auth-client";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/projects",
    label: "Projetos",
    icon: FolderKanban,
    matchPrefix: "/projects",
  },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  {
    href: "/projects/history",
    label: "Histórico",
    icon: FileText,
    matchPrefix: "/projects/history",
  },
  {
    href: "/settings/usage",
    label: "Configurações",
    icon: Settings,
    matchPrefix: "/settings",
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchPrefix) {
    if (item.matchPrefix === "/projects") {
      return (
        pathname === "/projects" ||
        (pathname.startsWith("/projects/") &&
          !pathname.startsWith("/projects/history"))
      );
    }
    return pathname === item.href || pathname.startsWith(item.matchPrefix + "/");
  }
  return pathname === item.href;
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  return (
    <aside
      aria-label="Navegação principal"
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-gray-800 bg-[#0E0E0E] px-4 py-6 lg:flex"
    >
      <Link href="/dashboard" className="mb-8 px-2">
        <h1 className="font-headline text-2xl font-black tracking-tighter text-white">
          nexvideo
        </h1>
      </Link>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#7C3AED]/15 text-white"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${active ? "text-[#A78BFA]" : "text-gray-500 group-hover:text-gray-300"}`}
              />
              <span>{item.label}</span>
              {active && (
                <span
                  aria-hidden="true"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-[#A78BFA]"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
      >
        <LogOut className="h-5 w-5" />
        <span>Sair</span>
      </button>
    </aside>
  );
}
