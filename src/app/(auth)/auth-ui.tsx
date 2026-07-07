"use client";

import { useState } from "react";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  GitHubIcon,
  GoogleIcon,
} from "@/components/icons";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

export const ctaClass =
  "h-[42px] w-full cursor-pointer rounded-auth bg-primary text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-hover disabled:cursor-default disabled:opacity-45";

export const ghostBtnClass =
  "inline-flex h-[38px] cursor-pointer items-center justify-center gap-[7px] rounded-field border border-line-field-strong px-4 text-[13px] font-medium text-fg-3 transition-colors duration-200 hover:bg-white/[0.04]";

const socialBtnClass =
  "flex h-[42px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-auth border border-line-field-strong bg-surface-raised text-[13.5px] font-medium text-fg-1 transition-colors duration-200 hover:border-line-hover hover:bg-[#1e1f23] disabled:cursor-default disabled:opacity-45";

export function AuthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-[400px] flex-col gap-3.5 rounded-panel border border-line-strong bg-surface-1 p-6 shadow-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ErrorBanner({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5 rounded-auth border border-danger/30 bg-danger/10 px-[13px] py-3">
      <span className="mt-px shrink-0 text-danger">
        <AlertTriangleIcon />
      </span>
      <div className="flex flex-col gap-[3px]">
        <span className="text-[13px] font-semibold text-[#f0b3b3]">
          {title}
        </span>
        <span className="text-xs leading-[1.45] text-[#b98b8b]">
          {children}
        </span>
      </div>
    </div>
  );
}

export function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[7px]">
      <span className="shrink-0 text-danger">
        <AlertCircleIcon />
      </span>
      <span className="text-xs text-[#e08c8c]">{children}</span>
    </div>
  );
}

export function AuthField({
  label,
  error = false,
  hint,
  right,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: boolean;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex items-center">
        <label className="text-xs font-medium text-fg-5" htmlFor={props.id}>
          {label}
        </label>
        {right}
      </div>
      <input
        className={cn(
          "h-10 w-full rounded-field border bg-surface-0 px-3 text-[13.5px] text-fg-2 outline-none transition-colors duration-200 placeholder:text-fg-8",
          error
            ? "border-danger/55 shadow-[0_0_0_3px_rgba(224,108,108,0.08)]"
            : "border-line-field focus:border-primary/40",
          className,
        )}
        {...props}
      />
      {hint && <span className="text-[11.5px] text-fg-9">{hint}</span>}
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-line-strong" />
      <span className="text-[11.5px] text-fg-9">{label}</span>
      <div className="h-px flex-1 bg-line-strong" />
    </div>
  );
}

/**
 * Botões GitHub/Google. Erros que voltam por redirect (?error=) chegam via
 * `oauthError`; falhas na própria chamada (ex.: provedor sem credenciais)
 * viram o mesmo banner (7c).
 */
export function SocialButtons({
  callbackURL,
  errorCallbackURL,
  oauthError,
}: {
  callbackURL: string;
  errorCallbackURL: string;
  oauthError?: string | null;
}) {
  const [failed, setFailed] = useState(Boolean(oauthError));
  const [pending, setPending] = useState<"github" | "google" | null>(null);

  async function social(provider: "github" | "google") {
    setPending(provider);
    setFailed(false);
    const res = await authClient.signIn.social({
      provider,
      callbackURL,
      errorCallbackURL,
    });
    if (res.error) {
      setFailed(true);
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {failed && (
        <ErrorBanner title="Não foi possível entrar">
          O acesso foi cancelado ou falhou no provedor. Tente de novo ou use
          email e senha.
        </ErrorBanner>
      )}
      <button
        type="button"
        className={socialBtnClass}
        disabled={pending !== null}
        onClick={() => social("github")}
      >
        <GitHubIcon size={17} />
        Continuar com GitHub
      </button>
      <button
        type="button"
        className={socialBtnClass}
        disabled={pending !== null}
        onClick={() => social("google")}
      >
        <GoogleIcon />
        Continuar com Google
      </button>
    </div>
  );
}
