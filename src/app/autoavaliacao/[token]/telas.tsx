import { Rodape } from "@/components/landing/rodape";
import { Topo } from "@/components/landing/topo";
import { CONTATO_EMAIL, WHATSAPP_EXIBICAO } from "@/lib/landing/config";

// Casca e telas de aviso da rota pública de autoavaliação. Sem AppShell: é a
// mesma estrutura da landing (/diagnostico), pensada para celular — mas em
// TEMA CLARO (ver [data-theme="light"] em globals.css). Regra da rota: cor só
// por token; nenhum hex/rgba literal (teste autoavaliacao-tema.test.ts).

export function CascaPublica({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="light": a serventia responde no celular, sob luz do dia —
    // tema claro fixo, só nesta rota (tokens redefinidos em globals.css).
    <main
      data-theme="light"
      className="min-h-dvh w-full px-4 pb-28 pt-6 md:px-10 md:pt-10"
      style={{
        background:
          "radial-gradient(120% 90% at 30% -10%, var(--color-canvas-top) 0%, var(--color-canvas-mid) 55%, var(--color-canvas-base) 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <Topo comoLink />
        {children}
        <Rodape className="mt-4" />
      </div>
    </main>
  );
}

export function TelaAviso({
  titulo,
  texto,
}: {
  titulo: string;
  texto: string;
}) {
  return (
    <CascaPublica>
      <div className="flex flex-col gap-3 rounded-panel border border-line-strong bg-surface-card p-6 md:p-8">
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-fg-hi">
          {titulo}
        </h1>
        <p className="text-[15px] leading-[1.55] text-fg-4">{texto}</p>
        <p className="text-[13px] leading-[1.55] text-fg-6">
          Fale com a Átrios: {CONTATO_EMAIL} · WhatsApp {WHATSAPP_EXIBICAO}.
        </p>
      </div>
    </CascaPublica>
  );
}

// Inválido e revogado dão a MESMA tela: não revelamos se o token existiu.
export function TelaLinkInvalido({ expirado }: { expirado: boolean }) {
  return (
    <TelaAviso
      titulo={expirado ? "Este link expirou" : "Este link não é válido"}
      texto={
        expirado
          ? "O prazo deste link de autoavaliação terminou. Peça um novo link à Átrios e continue de onde parou: suas respostas ficam guardadas."
          : "Não encontramos uma autoavaliação para este endereço. Confira se o link foi copiado inteiro ou peça um novo link à Átrios."
      }
    />
  );
}

export function TelaEmAnalise({ serventia }: { serventia: string }) {
  return (
    <TelaAviso
      titulo="Suas respostas estão em análise"
      texto={`A autoavaliação de ${serventia} já foi recebida e está sendo analisada pela equipe da Átrios. Em breve entramos em contato com o relatório.`}
    />
  );
}
