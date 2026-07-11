"use client";

// UI compartilhada do cofre (frames 13–16): chips, linha de acesso,
// modal criar/editar (14) e detalhe com auditoria (15a/15b).

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
} from "@/components/icons";
import { Avatar, Button, IconButton, Input, Sheet } from "@/components/ui";
import type { AccessAmbiente, AccessTipo } from "@/db/schema";
import { cn } from "@/lib/cn";
import {
  ACCESS_AMBIENTES,
  ACCESS_TIPOS,
  PASSWORD_MASK,
  TOTP_MASK,
} from "@/lib/vault-constants";
import {
  type AccessInput,
  createAccess,
  getSecret,
  updateAccess,
} from "./actions";

/* ---- Tipos compartilhados (sem campos de segredo, por construção) ------ */

export interface AccessRow {
  id: string;
  name: string;
  tipo: AccessTipo;
  ambiente: AccessAmbiente;
  login: string;
  hasTotp: boolean;
  notes: string | null;
  rotatedLabel: string;
  rotatedStale: boolean;
  rotationInfo: string;
  createdByName: string | null;
  createdAtLabel: string;
  productId: string;
  productName: string;
  productCode: string;
  productColor: string;
  events: { id: string; who: string; action: string; when: string }[];
}

export interface VaultProductOption {
  id: string;
  name: string;
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

/* ---- Chips -------------------------------------------------------------- */

export function VaultChip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-[5px] rounded-[5px] border border-line bg-white/[0.04] px-[7px] py-0.5 text-[11px] text-fg-5">
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export const tipoChip = (tipo: AccessTipo) => (
  <VaultChip
    label={ACCESS_TIPOS[tipo].label}
    color={ACCESS_TIPOS[tipo].color}
  />
);

export const ambienteChip = (amb: AccessAmbiente) => (
  <VaultChip
    label={ACCESS_AMBIENTES[amb].label}
    color={ACCESS_AMBIENTES[amb].color}
  />
);

/* ---- Linha de acesso (13a / 16) ----------------------------------------- */

export function AccessRowItem({
  row,
  showAmbiente,
  showAvatar,
  onOpen,
}: {
  row: AccessRow;
  showAmbiente?: boolean;
  showAvatar?: boolean;
  onOpen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const copyPassword = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const result = await getSecret(row.id, "password", "copy");
      if (result.value) {
        await navigator.clipboard?.writeText(result.value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    });
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: não pode ser <button> — contém o botão de copiar (button aninhado é HTML inválido)
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex w-full cursor-pointer items-center gap-3 border-b border-[rgba(255,255,255,0.035)] px-4 py-3 text-left transition-colors duration-200 hover:bg-white/[0.022] md:py-2.5"
    >
      {/* No mobile o nome+chips e o login empilham em duas linhas. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:contents">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 md:contents">
          <span className="min-w-0 truncate text-[14px] font-medium text-fg-2 md:w-[210px] md:shrink-0 md:text-[13px]">
            {row.name}
          </span>
          {tipoChip(row.tipo)}
          {showAmbiente && ambienteChip(row.ambiente)}
        </div>
        <span className="min-w-0 truncate font-mono text-xs text-fg-5 md:flex-1">
          {row.login}
        </span>
      </div>
      <span className="hidden shrink-0 font-mono text-xs tracking-[0.1em] text-fg-9 md:inline">
        {PASSWORD_MASK}
      </span>
      <IconButton
        aria-label="Copiar senha"
        size={26}
        className={cn(
          "shrink-0 bg-white/5 hover:bg-primary/25 hover:text-primary-fg-hi",
          copied && "text-status-done",
        )}
        onClick={copyPassword}
      >
        <CopyIcon />
      </IconButton>
      <span
        className={cn(
          "hidden w-[158px] shrink-0 text-right text-[11.5px] md:inline",
          row.rotatedStale ? "text-status-progress" : "text-fg-9",
        )}
      >
        {row.rotatedLabel}
      </span>
      {showAvatar && (
        <span className="hidden md:block">
          <Avatar size={20} initials={initialsOf(row.createdByName ?? "—")} />
        </span>
      )}
      <span className="shrink-0 text-fg-9">
        <ChevronRightIcon size={14} />
      </span>
    </div>
  );
}

/* ---- Modal criar/editar (frame 14) -------------------------------------- */

export function AccessModal({
  products,
  row,
  defaultProductId,
  onClose,
}: {
  products: VaultProductOption[];
  /** Presente = edição (mesmo modal, frame 14). */
  row?: AccessRow | null;
  defaultProductId?: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [productId, setProductId] = useState(
    row?.productId ?? defaultProductId ?? products[0]?.id ?? "",
  );
  const [tipo, setTipo] = useState<AccessTipo>(row?.tipo ?? "sistema");
  const [ambiente, setAmbiente] = useState<AccessAmbiente>(
    row?.ambiente ?? "producao",
  );
  const [login, setLogin] = useState(row?.login ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCodes, setTotpCodes] = useState("");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (pending) return;
    const input: AccessInput = {
      productId,
      name,
      tipo,
      ambiente,
      login,
      password,
      totpCodes,
      notes,
    };
    startTransition(async () => {
      const result = row
        ? await updateAccess(row.id, input)
        : await createAccess(input);
      if (result.error) setError(result.error);
      else onClose();
    });
  };

  const field =
    "h-11 w-full rounded-field border border-line-field bg-surface-1 px-3 text-base text-fg-2 outline-none placeholder:text-fg-8 focus:border-primary/40 md:h-[38px] md:text-[13px]";

  return (
    <Sheet
      mode="fullscreen"
      title={row ? "Editar acesso" : "Novo acesso"}
      onClose={onClose}
      action={{
        label: pending ? "Salvando…" : "Salvar",
        onClick: submit,
        disabled: pending,
      }}
      panelClassName="md:w-[540px]"
    >
      <div className="flex flex-col gap-[15px] p-4 md:p-[18px]">
        <div className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
          Nome do acesso
          <Input
            aria-label="Nome do acesso"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="lg"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
            Produto
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 size-[7px] -translate-y-1/2 rounded-full"
                style={{
                  background:
                    products.find((p) => p.id === productId)?.color ??
                    "#8b95a5",
                }}
              />
              <select
                aria-label="Produto"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={cn(field, "cursor-pointer appearance-none pl-7")}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-7">
                <ChevronDownIcon size={13} />
              </span>
            </div>
          </label>
          <label className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
            Tipo
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 size-[7px] -translate-y-1/2 rounded-full"
                style={{ background: ACCESS_TIPOS[tipo].color }}
              />
              <select
                aria-label="Tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as AccessTipo)}
                className={cn(field, "cursor-pointer appearance-none pl-7")}
              >
                {(Object.keys(ACCESS_TIPOS) as AccessTipo[]).map((t) => (
                  <option key={t} value={t}>
                    {ACCESS_TIPOS[t].label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-7">
                <ChevronDownIcon size={13} />
              </span>
            </div>
          </label>
        </div>
        <div className="flex flex-col gap-[7px]">
          <span className="text-xs font-medium text-fg-5">Ambiente</span>
          <div className="flex gap-0.5 rounded-field border border-line bg-[#0c0d0f] p-0.5">
            {(Object.keys(ACCESS_AMBIENTES) as AccessAmbiente[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmbiente(a)}
                className={cn(
                  "inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] text-[13px] font-medium transition-colors duration-200 md:h-[30px] md:text-[12.5px]",
                  a === ambiente
                    ? "bg-white/[0.09] text-fg-2"
                    : "text-fg-6 hover:text-fg-3",
                )}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: ACCESS_AMBIENTES[a].color }}
                />
                {ACCESS_AMBIENTES[a].label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-fg-9">
            Contas de plataformas geralmente não têm ambiente.
          </span>
        </div>
        <div className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
          Login / usuário
          <Input
            aria-label="Login / usuário"
            mono
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            size="lg"
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <span className="text-xs font-medium text-fg-5">Senha</span>
          <div className="flex h-11 items-center gap-2 rounded-field border border-line-field bg-surface-1 pl-3 pr-2 focus-within:border-primary/40 md:h-[38px]">
            <input
              aria-label="Senha"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={row ? "Deixar em branco para manter" : ""}
              className="min-w-0 flex-1 bg-transparent font-mono text-base tracking-[0.1em] text-fg-2 outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-fg-8 md:text-[13px]"
            />
            <IconButton
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              size={26}
              className="bg-white/5"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </IconButton>
          </div>
          <span className="text-[11px] text-fg-9">
            Criptografada no servidor · visível apenas para admins.
          </span>
        </div>
        <label className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
          <span>
            2FA · códigos de recuperação{" "}
            <span className="font-normal text-fg-9">opcional</span>
          </span>
          <textarea
            value={totpCodes}
            onChange={(e) => setTotpCodes(e.target.value)}
            placeholder={row?.hasTotp ? "Deixar em branco para manter" : ""}
            rows={2}
            className="min-h-[54px] w-full resize-none rounded-field border border-line-field bg-surface-1 px-3 py-2.5 font-mono text-[12.5px] leading-[1.7] text-fg-3 outline-none placeholder:font-sans placeholder:text-fg-8 focus:border-primary/40"
          />
        </label>
        <label className="flex flex-col gap-[7px] text-xs font-medium text-fg-5">
          <span>
            Notas <span className="font-normal text-fg-9">opcional</span>
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="min-h-[54px] w-full resize-none rounded-field border border-line-field bg-surface-1 px-3 py-2.5 text-[13px] leading-[1.55] text-fg-4 outline-none focus:border-primary/40"
          />
        </label>
        {error && <p className="text-xs leading-[1.4] text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}

/* ---- Detalhe do acesso (frames 15a/15b) --------------------------------- */

export function AccessDetail({
  row,
  isAdmin,
  onEdit,
  onClose,
}: {
  row: AccessRow;
  isAdmin: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState<"Copiar" | "Copiada">("Copiar");
  const [totpCopied, setTotpCopied] = useState(false);
  const [loginCopied, setLoginCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggleReveal = () => {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    startTransition(async () => {
      const result = await getSecret(row.id, "password", "reveal");
      if (result.error) setError(result.error);
      else {
        setRevealed(result.value ?? null);
        router.refresh();
      }
    });
  };

  const copy = (field: "password" | "totp") => {
    startTransition(async () => {
      const result = await getSecret(row.id, field, "copy");
      if (result.error) {
        setError(result.error);
        return;
      }
      await navigator.clipboard?.writeText(result.value ?? "");
      if (field === "password") {
        setCopyLabel("Copiada");
        setTimeout(() => setCopyLabel("Copiar"), 1800);
      } else {
        setTotpCopied(true);
        setTimeout(() => setTotpCopied(false), 1800);
      }
      router.refresh();
    });
  };

  const copyLogin = async () => {
    await navigator.clipboard?.writeText(row.login);
    setLoginCopied(true);
    setTimeout(() => setLoginCopied(false), 1800);
  };

  const sectionLabel =
    "text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8";

  return (
    <Sheet
      mode="bottom"
      ariaLabel={row.name}
      onClose={onClose}
      panelClassName="md:w-[720px] md:max-w-[92vw]"
    >
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3 md:px-[18px] md:py-3.5">
        <span className="min-w-0 truncate text-[15px] font-semibold text-fg-1 md:text-[14.5px]">
          {row.name}
        </span>
        {tipoChip(row.tipo)}
        {ambienteChip(row.ambiente)}
        <div className="ml-auto" />
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Editar
        </Button>
        <IconButton
          aria-label="Fechar"
          className="max-md:hidden"
          onClick={onClose}
        >
          <CloseIcon size={16} />
        </IconButton>
      </div>
      <div className="flex flex-col md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-[18px] border-line p-4 md:border-r md:p-5">
          <div className="flex flex-col gap-2">
            <span className={sectionLabel}>Login</span>
            <div className="flex h-[38px] items-center gap-2 rounded-field border border-line-field bg-surface-1 pl-3 pr-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-fg-2">
                {row.login}
              </span>
              <IconButton
                aria-label="Copiar login"
                size={26}
                className={cn(
                  "bg-white/5 hover:bg-primary/25 hover:text-primary-fg-hi",
                  loginCopied && "text-status-done",
                )}
                onClick={copyLogin}
              >
                <CopyIcon />
              </IconButton>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className={sectionLabel}>Senha</span>
            <div className="flex h-[38px] items-center gap-1.5 rounded-field border border-line-field bg-surface-1 pl-3 pr-2">
              <span
                className={cn(
                  "min-w-0 flex-1 truncate font-mono text-[12.5px]",
                  revealed !== null
                    ? "tracking-[0.02em] text-fg-2"
                    : "tracking-[0.1em] text-fg-7",
                )}
              >
                {revealed ?? "••••••••••••••"}
              </span>
              {isAdmin && (
                <IconButton
                  aria-label={revealed !== null ? "Ocultar" : "Revelar"}
                  size={26}
                  className="bg-white/5"
                  onClick={toggleReveal}
                >
                  {revealed !== null ? <EyeOffIcon /> : <EyeIcon />}
                </IconButton>
              )}
              <button
                type="button"
                onClick={() => copy("password")}
                className={cn(
                  "inline-flex h-[26px] shrink-0 cursor-pointer items-center gap-[5px] rounded-[6px] bg-white/5 px-[9px] text-[11.5px] font-medium transition-colors duration-200 hover:bg-primary/25",
                  copyLabel === "Copiada"
                    ? "text-status-done"
                    : "text-fg-5 hover:text-primary-fg-hi",
                )}
              >
                <CopyIcon size={12} />
                {copyLabel}
              </button>
            </div>
            <span className="text-[11px] leading-[1.5] text-fg-9">
              {isAdmin
                ? "Cada visualização e cópia fica registrada na auditoria."
                : "Somente admins podem revelar a senha. A cópia é permitida e fica registrada na auditoria."}
            </span>
          </div>
          {row.hasTotp && (
            <div className="flex flex-col gap-2">
              <span className={sectionLabel}>2FA · códigos de recuperação</span>
              <div className="flex items-center gap-2 rounded-field border border-line-field bg-surface-1 py-2.5 pl-3 pr-2">
                <span className="min-w-0 flex-1 truncate font-mono text-xs tracking-[0.08em] text-fg-9">
                  {TOTP_MASK}
                </span>
                <IconButton
                  aria-label="Copiar códigos"
                  size={26}
                  className={cn(
                    "bg-white/5 hover:bg-primary/25 hover:text-primary-fg-hi",
                    totpCopied && "text-status-done",
                  )}
                  onClick={() => copy("totp")}
                >
                  <CopyIcon />
                </IconButton>
              </div>
            </div>
          )}
          {row.notes && (
            <div className="flex flex-col gap-2">
              <span className={sectionLabel}>Notas</span>
              <p className="text-[13px] leading-[1.6] text-fg-4">{row.notes}</p>
            </div>
          )}
          {error && (
            <p className="text-xs leading-[1.4] text-danger">{error}</p>
          )}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-5 border-t border-line p-4 md:w-[264px] md:border-t-0 md:p-5">
          <div className="flex flex-col gap-[9px]">
            <span className={sectionLabel}>Criado por</span>
            <div className="flex items-center gap-2">
              <Avatar
                size={22}
                initials={initialsOf(row.createdByName ?? "—")}
              />
              <span className="text-[12.5px] text-fg-2">
                {row.createdByName ?? "—"}
              </span>
              <span className="ml-auto text-[11.5px] text-fg-9">
                {row.createdAtLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-[9px]">
            <span className={sectionLabel}>Última rotação</span>
            <span className="text-[12.5px] text-fg-4">{row.rotationInfo}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className={sectionLabel}>Auditoria</span>
            {row.events.length === 0 && (
              <span className="text-xs text-fg-8">Sem eventos.</span>
            )}
            {row.events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-2">
                <Avatar size={20} initials={initialsOf(ev.who)} />
                <div className="flex min-w-0 flex-col gap-px">
                  <span className="text-xs leading-[1.4] text-fg-4">
                    <span className="font-medium text-fg-2">{ev.who}</span>{" "}
                    {ev.action}
                  </span>
                  <span className="text-[11px] text-fg-9">{ev.when}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
