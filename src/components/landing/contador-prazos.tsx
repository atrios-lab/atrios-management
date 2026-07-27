import { cn } from "@/lib/cn";
import { CLASSES, type Norma } from "@/lib/landing/norma";

// Contador de prazos das Etapas 1 e 2 no RN — compartilhado pela home e pela
// `/diagnostico`. Toda data/contagem vem de `norma` (parametro_norma); este
// componente só formata.

export function ContadorPrazos({
  norma,
  className,
}: {
  norma: Norma;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[12px] border border-[rgba(224,108,108,0.22)] bg-[rgba(224,108,108,0.06)] p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#e08a8a]">
          Prazo das Etapas 1 e 2 no RN
        </span>
        <span className="text-xs leading-[1.45] text-fg-5">
          {norma.prorrogacaoDias > 0
            ? `Já com a prorrogação de ${norma.prorrogacaoDias} dias concedida pela Corregedoria (CGJ-RN)`
            : `Prazos do art. 20, contados da vigência do Provimento 243/2026 (${norma.vigencia})`}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {CLASSES.map((classe) => (
          <div key={classe} className="flex flex-col">
            <span className="text-[11.5px] font-medium text-fg-5">
              Classe {classe}
            </span>
            <span className="text-[25px] font-bold leading-[1.15] tracking-[-0.02em] text-danger md:text-[27px]">
              {norma.porClasse[classe].diasRestantes}
              <span className="ml-1 text-xs font-medium text-[#c98686]">
                dias
              </span>
            </span>
            <span className="text-[10.5px] text-[#6b6f7a]">
              até {norma.porClasse[classe].dataLimite}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
