"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridIcon, KeyIcon, UserIcon, UsersIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/produtos", label: "Produtos", Icon: GridIcon },
  { href: "/cofre", label: "Cofre", Icon: KeyIcon },
  { href: "/time", label: "Time", Icon: UsersIcon },
  { href: "/voce", label: "Você", Icon: UserIcon },
] as const;

/** Navegação inferior do mobile (< 768px) — substitui a sidebar. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-[#0b0c0e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-colors duration-150",
              active ? "text-[#e4e5e8]" : "text-fg-7 active:text-fg-4",
            )}
          >
            <Icon size={19} />
            <span className="text-[11px] font-medium leading-none">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
