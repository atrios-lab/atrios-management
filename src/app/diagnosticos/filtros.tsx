"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUS_FUNIL, UFS } from "@/lib/diagnostico/constants";

const SCORE_FAIXAS = [
  { value: "adequado", label: "Adequado (≥80%)" },
  { value: "atencao", label: "Atenção (40–79%)" },
  { value: "critico", label: "Crítico (<40%)" },
];

const selectClass =
  "h-[30px] cursor-pointer rounded-btn border border-line-field bg-surface-1 px-2 text-[12.5px] text-fg-3 outline-none transition-colors duration-200 focus:border-primary/40";

export function Filtros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const val = (key: string) => searchParams.get(key) ?? "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filtrar por UF"
        className={selectClass}
        value={val("uf")}
        onChange={(e) => set("uf", e.target.value)}
      >
        <option value="">UF — todas</option>
        {UFS.map((uf) => (
          <option key={uf} value={uf}>
            {uf}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por classe"
        className={selectClass}
        value={val("classe")}
        onChange={(e) => set("classe", e.target.value)}
      >
        <option value="">Classe — todas</option>
        <option value="1">Classe 1</option>
        <option value="2">Classe 2</option>
        <option value="3">Classe 3</option>
      </select>
      <select
        aria-label="Filtrar por status do funil"
        className={selectClass}
        value={val("status")}
        onChange={(e) => set("status", e.target.value)}
      >
        <option value="">Funil — todos</option>
        {STATUS_FUNIL.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por score"
        className={selectClass}
        value={val("score")}
        onChange={(e) => set("score", e.target.value)}
      >
        <option value="">Score — todos</option>
        {SCORE_FAIXAS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

