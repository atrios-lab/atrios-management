"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArchLogo } from "@/components/icons";
import { authClient } from "@/lib/auth-client";
import {
  AuthField,
  ctaClass,
  Divider,
  InlineError,
  SocialButtons,
} from "../auth-ui";

export function LoginCard({ oauthError }: { oauthError: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setInvalid(false);
    const res = await authClient.signIn.email({ email, password });
    if (res.error) {
      setInvalid(true);
      setPending(false);
      return;
    }
    router.push("/produtos");
    router.refresh();
  }

  return (
    <div className="flex w-[352px] flex-col">
      <div className="mb-[22px] flex size-[52px] items-center justify-center self-center rounded-panel bg-linear-160 from-primary-grad-a to-primary-grad-b [box-shadow:0_10px_30px_rgba(94,106,210,0.4)]">
        <ArchLogo size={26} />
      </div>
      <h1 className="mb-2 text-center text-[21px] font-semibold tracking-[-0.02em] text-fg-hi">
        Átrios Management
      </h1>
      <p className="mb-7 text-center text-[13.5px] leading-normal text-fg-6">
        Entre para acompanhar os produtos da Átrios.
      </p>
      <SocialButtons
        callbackURL="/produtos"
        errorCallbackURL="/login"
        oauthError={oauthError}
      />
      <div className="my-5">
        <Divider label="ou" />
      </div>
      <form onSubmit={submit} className="flex flex-col gap-[13px]">
        <AuthField
          label="Email"
          id="login-email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@atrios.com.br"
          className="bg-surface-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex flex-col gap-[7px]">
          <AuthField
            label="Senha"
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="bg-surface-1"
            error={invalid}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            right={
              <Link
                href="/esqueci-senha"
                className="ml-auto text-[11.5px] text-primary-ink hover:text-primary-fg-hi"
              >
                Esqueci minha senha
              </Link>
            }
          />
          {invalid && (
            <InlineError>
              Email ou senha inválidos. Confira e tente de novo.
            </InlineError>
          )}
        </div>
        <button
          type="submit"
          className={`${ctaClass} mt-[5px]`}
          disabled={pending}
        >
          Entrar
        </button>
      </form>
      <p className="mt-5 text-center text-[11.5px] text-fg-9">
        Acesso restrito ao time da Átrios.
      </p>
    </div>
  );
}
