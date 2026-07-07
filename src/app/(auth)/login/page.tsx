import { redirect } from "next/navigation";
import { LoginCard } from "./login-card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // OAuth concluiu mas o email não tem usuário nem convite (H1 → H8).
  if (error?.startsWith("sem_convite")) redirect("/sem-convite");
  return <LoginCard oauthError={error ?? null} />;
}
