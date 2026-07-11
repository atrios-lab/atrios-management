"use client";

import { useState, useTransition } from "react";
import {
  AlertCircleIcon,
  CloseIcon,
  MailIcon,
  PlusIcon,
} from "@/components/icons";
import {
  Avatar,
  Badge,
  Button,
  IconButton,
  Input,
  Sheet,
  StatusPill,
} from "@/components/ui";

import {
  cancelInvite,
  changeRole,
  inviteMember,
  removeMember,
  resendInvite,
} from "./actions";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
}

export interface PendingInvite {
  id: string;
  email: string;
  role: "admin" | "member";
  expired: boolean;
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

const roleSelectClass =
  "h-[26px] cursor-pointer rounded-btn border border-line-field bg-surface-1 px-1.5 text-xs text-fg-4 outline-none transition-colors duration-200 hover:border-line-hover";

export function TeamView({
  meId,
  isAdmin,
  members,
  invites,
}: {
  meId: string;
  isAdmin: boolean;
  members: Member[];
  invites: PendingInvite[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
    });
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-[9px] border-b border-line px-4 md:h-[53px] md:px-5">
        <span className="text-[20px] font-semibold text-fg-1 md:text-sm">
          Time
        </span>
        <span className="text-xs text-fg-8">{members.length}</span>
        <div className="ml-auto" />
        {isAdmin && (
          <Button icon={<PlusIcon />} onClick={() => setModalOpen(true)}>
            <span className="hidden md:inline">Convidar</span>
          </Button>
        )}
      </header>
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-field border border-danger/30 bg-danger/10 px-3 py-2.5">
            <span className="shrink-0 text-danger">
              <AlertCircleIcon />
            </span>
            <span className="text-xs text-[#e08c8c]">{error}</span>
          </div>
        )}
        <div className="py-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3.5 border-b border-line-subtle px-4 py-3 md:px-5 md:py-[11px]"
            >
              <Avatar initials={initialsOf(m.name)} size={30} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-medium text-fg-2">
                  {m.name}
                  {m.id === meId && (
                    <span className="ml-1.5 text-[11px] font-normal text-fg-8">
                      você
                    </span>
                  )}
                </span>
                <span className="truncate text-[11.5px] text-fg-7">
                  {m.email}
                </span>
              </div>
              <div className="ml-auto" />
              {isAdmin ? (
                <select
                  aria-label={`Role de ${m.name}`}
                  className={roleSelectClass}
                  value={m.role}
                  onChange={(e) =>
                    run(() =>
                      changeRole(m.id, e.target.value as "admin" | "member"),
                    )
                  }
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <Badge tone={m.role === "admin" ? "primary" : "neutral"}>
                  {m.role === "admin" ? "Admin" : "Member"}
                </Badge>
              )}
              {isAdmin && m.id !== meId && (
                <IconButton
                  aria-label={`Remover ${m.name}`}
                  className="hover:text-danger"
                  onClick={() => {
                    if (confirm(`Remover ${m.name} do time?`))
                      run(() => removeMember(m.id));
                  }}
                >
                  <CloseIcon size={13} />
                </IconButton>
              )}
            </div>
          ))}
          {invites.map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-3.5 border-b border-line-subtle px-4 py-3 md:px-5 md:py-[11px]"
            >
              <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full border border-dashed border-line-hover text-fg-7">
                <MailIcon size={13} />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] text-fg-4">
                  {i.email}
                </span>
                <span className="text-[11.5px] text-fg-8">
                  {i.role === "admin" ? "Admin" : "Member"} · convite enviado
                </span>
              </div>
              <div className="ml-auto" />
              <StatusPill
                hue={i.expired ? "archived" : "progress"}
                className="text-[11.5px]"
              >
                {i.expired ? "Expirado" : "Pendente"}
              </StatusPill>
              {isAdmin && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => run(() => resendInvite(i.id))}
                  >
                    Reenviar
                  </Button>
                  <IconButton
                    aria-label={`Cancelar convite de ${i.email}`}
                    className="hover:text-danger"
                    onClick={() => {
                      if (confirm(`Cancelar o convite de ${i.email}?`))
                        run(() => cancelInvite(i.id));
                    }}
                  >
                    <CloseIcon size={13} />
                  </IconButton>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {modalOpen && (
        <InviteModal
          onClose={() => setModalOpen(false)}
          onError={(msg) => setError(msg)}
        />
      )}
    </>
  );
}

function InviteModal({
  onClose,
  onError,
}: {
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [localError, setLocalError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setLocalError(null);
    startTransition(async () => {
      const res = await inviteMember(email, role);
      if (res.error) {
        setLocalError(res.error);
        return;
      }
      onError("");
      onClose();
    });
  }

  return (
    <Sheet
      mode="bottom"
      title="Convidar para o time"
      onClose={onClose}
      action={{
        label: pending ? "Enviando…" : "Enviar",
        onClick: submit,
        disabled: pending,
      }}
      panelClassName="md:w-[420px]"
    >
      <div className="flex flex-col gap-4 p-4 md:p-[18px]">
        <div className="flex flex-col gap-[7px]">
          <label
            htmlFor="invite-email"
            className="text-xs font-medium text-fg-5"
          >
            Email
          </label>
          <Input
            id="invite-email"
            size="lg"
            type="email"
            placeholder="pessoa@atrios.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label
            htmlFor="invite-role"
            className="text-xs font-medium text-fg-5"
          >
            Role
          </label>
          <select
            id="invite-role"
            className="h-11 w-full cursor-pointer rounded-field border border-line-field bg-surface-1 px-3 text-base text-fg-2 outline-none transition-colors duration-200 focus:border-primary/40 md:h-[38px] md:text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "member")}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {localError && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-danger">
              <AlertCircleIcon />
            </span>
            <span className="text-xs text-[#e08c8c]">{localError}</span>
          </div>
        )}
      </div>
    </Sheet>
  );
}
