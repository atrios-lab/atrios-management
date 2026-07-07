"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, MailIcon } from "@/components/icons";
import { authClient } from "@/lib/auth-client";
import { AuthCard, AuthField, ctaClass, ghostBtnClass } from "../auth-ui";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    // Resposta neutra sempre — não revela se o email existe (H3).
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/redefinir-senha",
    });
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard className="items-center gap-[13px] px-6 py-[30px] text-center">
        <div className="flex size-[46px] items-center justify-center rounded-full border border-primary/30 bg-primary/12 text-primary-ink">
          <MailIcon size={19} />
        </div>
        <span className="text-[16.5px] font-semibold tracking-[-0.01em] text-fg-hi">
          Verifique seu email
        </span>
        <p className="max-w-[300px] text-[13px] leading-[1.55] text-fg-5">
          Se existir uma conta para <span className="text-fg-2">{email}</span>,
          enviamos um link para redefinir a senha.
        </p>
        <span className="text-[11.5px] text-fg-8">
          O link expira em 60 minutos.
        </span>
        <Link href="/login" className={ghostBtnClass}>
          Voltar ao login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 self-start text-xs text-primary-ink hover:text-primary-fg-hi"
      >
        <ArrowLeftIcon />
        Voltar ao login
      </Link>
      <div className="flex flex-col gap-[5px]">
        <span className="text-[16.5px] font-semibold tracking-[-0.01em] text-fg-hi">
          Redefinir senha
        </span>
        <span className="text-[12.5px] leading-normal text-fg-6">
          Informe seu email e enviaremos um link para criar uma nova senha.
        </span>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <AuthField
          label="Email"
          id="fp-email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@atrios.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className={ctaClass} disabled={pending}>
          Enviar link
        </button>
      </form>
    </AuthCard>
  );
}
