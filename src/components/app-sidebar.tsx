"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArchLogo,
  ClipboardCheckIcon,
  GridIcon,
  KeyIcon,
  SignOutIcon,
  UsersIcon,
} from "@/components/icons";
import { Avatar, SidebarItem } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

export interface SidebarUser {
  name: string;
  email: string;
  role: "admin" | "member";
}

export interface SidebarProduct {
  name: string;
  code: string;
  color: string;
}

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function AppSidebar({
  user,
  products,
}: {
  user: SidebarUser;
  products: SidebarProduct[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const navClass = (active: boolean) =>
    cn(
      "flex items-center gap-[9px] rounded-btn px-2 py-[7px] text-[13px] font-medium transition-colors duration-200",
      active
        ? "bg-white/5 text-fg-2"
        : "text-fg-4 hover:bg-white/[0.04] hover:text-fg-2",
    );

  return (
    <aside className="hidden w-[216px] shrink-0 flex-col border-r border-line bg-surface-2 px-2.5 py-3.5 md:flex">
      <div className="flex items-center gap-[9px] px-2 pb-3.5 pt-1.5">
        <div className="flex size-[22px] items-center justify-center rounded-nav bg-linear-160 from-primary-grad-a to-primary-grad-b">
          <ArchLogo />
        </div>
        <span className="text-sm font-semibold tracking-[-0.01em] text-fg-1">
          Átrios
        </span>
      </div>
      <Link href="/produtos" className={navClass(pathname === "/produtos")}>
        <GridIcon />
        Produtos
      </Link>
      <Link href="/cofre" className={navClass(pathname.startsWith("/cofre"))}>
        <KeyIcon />
        Cofre
      </Link>
      <Link
        href="/diagnosticos"
        className={navClass(pathname.startsWith("/diagnosticos"))}
      >
        <ClipboardCheckIcon />
        Diagnósticos
      </Link>
      <Link href="/time" className={navClass(pathname === "/time")}>
        <UsersIcon />
        Time
      </Link>
      <div className="px-2 pb-1.5 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-9">
        Produtos
      </div>
      {products.map((p) => (
        <Link key={p.code} href={`/produtos/${p.code}`}>
          <SidebarItem
            label={p.name}
            color={p.color}
            active={pathname === `/produtos/${p.code}`}
          />
        </Link>
      ))}
      <button
        type="button"
        popoverTarget="sidebar-user-menu"
        className="mt-auto flex w-full cursor-pointer items-center gap-[9px] rounded-btn border-t border-line-subtle p-2 text-left transition-colors duration-200 hover:bg-white/[0.03]"
      >
        <Avatar initials={initialsOf(user.name)} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[12.5px] font-medium text-fg-2">
            {user.name}
          </span>
          <span className="truncate text-[11px] text-fg-8">{user.email}</span>
        </div>
      </button>
      <div
        id="sidebar-user-menu"
        popover="auto"
        className="fixed inset-auto bottom-[58px] left-2.5 m-0 w-[196px] rounded-field border border-line-strong bg-surface-raised p-1 shadow-modal"
      >
        <div className="flex min-w-0 flex-col px-2 py-1.5">
          <span className="truncate text-[12.5px] font-medium text-fg-2">
            {user.name}
          </span>
          <span className="truncate text-[11px] text-fg-7">{user.email}</span>
        </div>
        <div className="mx-1 my-1 h-px bg-line-subtle" />
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full cursor-pointer items-center gap-2 rounded-btn px-2 py-1.5 text-[12.5px] text-fg-4 transition-colors duration-200 hover:bg-white/5 hover:text-fg-1"
        >
          <SignOutIcon />
          Sair
        </button>
      </div>
    </aside>
  );
}
