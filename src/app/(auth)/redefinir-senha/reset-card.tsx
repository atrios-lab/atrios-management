"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AuthCard, AuthField, ctaClass, InlineError } from "../auth-ui";

export function ResetCard({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    if (res.error) {
      setError(
        "Link inválido ou expirado. Peça um novo em Esqueci minha senha.",
      );
      setPending(false);
      return;
    }
    router.push("/login");
  }

  return (
    <AuthCard>
      <div className="flex flex-col gap-[5px]">
        <span className="text-[16.5px] font-semibold tracking-[-0.01em] text-fg-hi">
          Criar nova senha
        </span>
        <span className="text-[12.5px] leading-normal text-fg-6">
          Escolha uma nova senha para a sua conta.
        </span>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <AuthField
          label="Nova senha"
          id="rp-password"
          type="password"
          required
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <AuthField
          label="Confirmar senha"
          id="rp-confirm"
          type="password"
          required
          autoComplete="new-password"
          error={confirm.length > 0 && confirm !== password}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <InlineError>{error}</InlineError>}
        <button type="submit" className={ctaClass} disabled={pending}>
          Redefinir senha
        </button>
      </form>
    </AuthCard>
  );
}
