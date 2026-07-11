"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRightIcon,
  ClipboardCheckIcon,
  SignOutIcon,
  UsersIcon,
} from "@/components/icons";
import { Avatar, Badge } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

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

/** Tela "Você" (M12): perfil, atalhos e sessão. */
export function VoceView({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const rowClass =
    "flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 text-[14.5px] text-fg-2 transition-colors duration-150 hover:bg-white/[0.03] active:bg-white/[0.05]";

  return (
    <>
      <header className="flex h-14 shrink-0 items-center border-b border-line px-4 md:h-[53px] md:px-5">
        <span className="text-[20px] font-semibold text-fg-1 md:text-sm">
          Você
        </span>
      </header>
      <div className="flex-1 overflow-auto p-4 md:p-5">
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
          {/* perfil */}
          <div className="flex items-center gap-3.5 rounded-[13px] border border-[rgba(255,255,255,0.07)] bg-surface-1 p-4">
            <Avatar initials={initialsOf(name)} size={48} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[16px] font-semibold tracking-[-0.01em] text-fg-1">
                {name}
              </span>
              <span className="truncate text-[13px] text-fg-6">{email}</span>
            </div>
            <div className="ml-auto shrink-0">
              <Badge tone={isAdmin ? "primary" : "neutral"}>
                {isAdmin ? "Admin" : "Member"}
              </Badge>
            </div>
          </div>

          {/* atalhos */}
          <div className="overflow-hidden rounded-[13px] border border-[rgba(255,255,255,0.07)] bg-surface-1">
            <Link href="/time" className={rowClass}>
              <span className="text-fg-6">
                <UsersIcon />
              </span>
              Time
              <span className="ml-auto text-fg-9">
                <ChevronRightIcon size={14} />
              </span>
            </Link>
            <div className="mx-4 h-px bg-line-subtle" />
            <Link href="/diagnosticos" className={rowClass}>
              <span className="text-fg-6">
                <ClipboardCheckIcon />
              </span>
              Diagnósticos
              <span className="ml-auto text-fg-9">
                <ChevronRightIcon size={14} />
              </span>
            </Link>
          </div>

          {/* sessão */}
          <div className="overflow-hidden rounded-[13px] border border-[rgba(255,255,255,0.07)] bg-surface-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 text-[14.5px] text-danger transition-colors duration-150 hover:bg-danger/5 active:bg-danger/10"
            >
              <SignOutIcon size={15} />
              Sair
            </button>
          </div>

          <span className="px-1 text-center text-[11.5px] text-fg-9">
            Átrios Management · acesso restrito ao time
          </span>
        </div>
      </div>
    </>
  );
}
