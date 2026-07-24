import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  isMes,
  MONEY_PREFS_PADRAO,
  type MoneyPrefs,
  mesAtual,
} from "@/lib/financeiro-constants";
import { FinanceiroView, MONEY_PREFS_COOKIE } from "./financeiro-view";
import { lancamentosDoMes, produtoOptions, resumoDoMes } from "./queries";

/** "0,1" → { ocultarValores: false, mostrarCentavos: true }. */
function parsePrefs(raw: string | undefined): MoneyPrefs {
  const [ocultar, centavos] = (raw ?? "").split(",");
  if (ocultar === undefined || centavos === undefined)
    return MONEY_PREFS_PADRAO;
  return { ocultarValores: ocultar === "1", mostrarCentavos: centavos === "1" };
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  // 404 e não 403: para quem não é admin o módulo simplesmente não existe.
  if ((session?.user as { role?: string } | undefined)?.role !== "admin")
    notFound();

  const { mes: mesParam } = await searchParams;
  const mesCorrente = mesAtual();
  const mes = mesParam && isMes(mesParam) ? mesParam : mesCorrente;

  const [lancamentos, produtos, prefsCookie] = await Promise.all([
    lancamentosDoMes(mes),
    produtoOptions(),
    cookies().then((c) => c.get(MONEY_PREFS_COOKIE)?.value),
  ]);
  const resumo = await resumoDoMes(mes, lancamentos);

  return (
    <FinanceiroView
      mes={mes}
      mesCorrente={mesCorrente}
      lancamentos={lancamentos}
      resumo={resumo}
      produtos={produtos}
      usuario={session?.user.name ?? ""}
      prefsIniciais={parsePrefs(prefsCookie)}
    />
  );
}
