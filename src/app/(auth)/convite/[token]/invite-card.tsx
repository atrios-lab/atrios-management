"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockIcon, MailIcon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import {
  AuthCard,
  AuthField,
  ctaClass,
  Divider,
  ErrorBanner,
  ghostBtnClass,
  InlineError,
  SocialButtons,
} from "../../auth-ui";

function initialsOf(name: string | null) {
  if (!name) return "Á";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function InviteCard({
  token,
  email,
  inviter,
  oauthError,
}: {
  token: string;
  email: string;
  inviter: string | null;
  oauthError: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // OAuth voltou bloqueado: a conta do provedor usa outro email (9b).
  const mismatch = Boolean(oauthError?.startsWith("sem_convite"));
  const otherEmail = mismatch ? (oauthError?.split(":")[1] ?? null) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await authClient.signUp.email({ email, password, name });
    if (res.error) {
      if (res.error.message?.startsWith("sem_convite")) {
        // Convite consumido entre o render e o submit → re-renderiza como 9c.
        router.refresh();
        return;
      }
      setError(res.error.message ?? "Não foi possível criar a conta.");
      setPending(false);
      return;
    }
    router.push("/produtos");
    router.refresh();
  }

  if (mismatch) {
    return (
      <AuthCard className="md:max-w-[420px]">
        <ErrorBanner title="Conta em outro email">
          {otherEmail ? (
            <>
              Sua conta no provedor está em{" "}
              <span className="text-[#e0a5a5]">{otherEmail}</span>, mas este
              convite é para <span className="text-[#e0a5a5]">{email}</span>.
            </>
          ) : (
            <>
              A conta usada no provedor não corresponde a{" "}
              <span className="text-[#e0a5a5]">{email}</span>, o email deste
              convite.
            </>
          )}
        </ErrorBanner>
        <Link
          href={`/convite/${token}`}
          className={`${ghostBtnClass} self-start`}
        >
          Tentar outro método
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard className="gap-4 md:max-w-[440px]">
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(inviter)} size={38} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[12.5px] text-fg-5">
            {inviter ? `${inviter} convidou você` : "Você recebeu um convite"}
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.01em] text-fg-hi">
            Entre no time da Átrios
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex h-10 items-center gap-[9px] rounded-field border border-line-strong bg-white/[0.03] px-3">
          <span className="text-fg-7">
            <MailIcon />
          </span>
          <span className="text-[13.5px] text-fg-4">{email}</span>
          <span className="ml-auto text-fg-8">
            <LockIcon />
          </span>
        </div>
        <span className="text-[11.5px] text-fg-9">
          O convite vale apenas para este email.
        </span>
      </div>
      <SocialButtons
        callbackURL="/produtos"
        errorCallbackURL={`/convite/${token}`}
      />
      <Divider label="ou defina uma senha" />
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <AuthField
          label="Nome"
          id="inv-name"
          required
          autoComplete="name"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <AuthField
          label="Senha"
          id="inv-password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Crie uma senha"
          hint="Mínimo de 8 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <InlineError>{error}</InlineError>}
        <button type="submit" className={ctaClass} disabled={pending}>
          Criar conta
        </button>
      </form>
    </AuthCard>
  );
}
