"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import type { DiagnosticoEscopo, DiagnosticoModelo } from "@/db/schema";
import {
  CLASSE_LABEL,
  ESCOPO_LABEL,
  MODELO_LABEL,
  SUBCLASSES,
  UFS,
} from "@/lib/diagnostico/constants";
import { createDiagnostico } from "../actions";

const selectClass =
  "h-9 w-full cursor-pointer rounded-field border border-line-field bg-surface-1 px-3 text-sm text-fg-2 outline-none transition-colors duration-200 focus:border-primary/40";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={htmlFor} className="text-xs font-medium text-fg-5">
        {label}
      </label>
      {children}
    </div>
  );
}

export interface NovoDiagnosticoInitial {
  serventia?: string;
  cns?: string;
  municipio?: string;
  uf?: string;
  classe?: number;
  subclasse?: string;
  contatoNome?: string;
  contatoEmail?: string;
  contatoWhatsapp?: string;
}

export function NovoDiagnosticoForm({
  initial,
}: {
  initial?: NovoDiagnosticoInitial;
}) {
  const router = useRouter();
  const [serventia, setServentia] = useState(initial?.serventia ?? "");
  const [cns, setCns] = useState(initial?.cns ?? "");
  const [municipio, setMunicipio] = useState(initial?.municipio ?? "");
  const [uf, setUf] = useState(initial?.uf ?? "");
  const [classe, setClasse] = useState(initial?.classe ?? 0);
  const [subclasse, setSubclasse] = useState(initial?.subclasse ?? "");
  const [modelo, setModelo] = useState<DiagnosticoModelo>("propria");
  const [contatoNome, setContatoNome] = useState(initial?.contatoNome ?? "");
  const [contatoEmail, setContatoEmail] = useState(initial?.contatoEmail ?? "");
  const [contatoWhatsapp, setContatoWhatsapp] = useState(
    initial?.contatoWhatsapp ?? "",
  );
  const [escopo, setEscopo] = useState<DiagnosticoEscopo>("inicial");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await createDiagnostico({
        serventia,
        cns,
        municipio,
        uf,
        classe,
        subclasse,
        modeloSolucao: modelo,
        contatoNome,
        contatoEmail,
        contatoWhatsapp,
        escopo,
      });
      if (result.error || !result.id) {
        setError(result.error ?? "Não foi possível criar o diagnóstico.");
        return;
      }
      router.push(`/diagnosticos/${result.id}`);
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-panel border border-line bg-surface-card p-[18px]">
      <Field label="Nome da serventia *" htmlFor="nd-serventia">
        <Input
          id="nd-serventia"
          value={serventia}
          onChange={(e) => setServentia(e.target.value)}
          placeholder="Cartório do 1º Ofício de…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CNS" htmlFor="nd-cns">
          <Input
            id="nd-cns"
            value={cns}
            onChange={(e) => setCns(e.target.value)}
            placeholder="Código Nacional da Serventia"
          />
        </Field>
        <div className="grid grid-cols-[1fr_84px] gap-3">
          <Field label="Município" htmlFor="nd-municipio">
            <Input
              id="nd-municipio"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
            />
          </Field>
          <Field label="UF *" htmlFor="nd-uf">
            <select
              id="nd-uf"
              className={selectClass}
              value={uf}
              onChange={(e) => setUf(e.target.value)}
            >
              <option value="">—</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field
          label="Qual a receita bruta do cartório, em média, por semestre? *"
          htmlFor="nd-classe"
        >
          <select
            id="nd-classe"
            className={selectClass}
            value={classe || ""}
            onChange={(e) => {
              setClasse(Number(e.target.value));
              setSubclasse("");
            }}
          >
            <option value="">Selecione…</option>
            {[1, 2, 3].map((c) => (
              <option key={c} value={c}>
                {CLASSE_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subclasse" htmlFor="nd-subclasse">
          <select
            id="nd-subclasse"
            className={selectClass}
            value={subclasse}
            onChange={(e) => setSubclasse(e.target.value)}
            disabled={!classe}
          >
            <option value="">—</option>
            {(SUBCLASSES[classe] ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="-mt-2 text-[11px] leading-snug text-fg-8">
        Receita bruta semestral (art. 2º, XXIV): emolumentos e demais receitas
        do serviço, inclusive ressarcimento de atos gratuitos e complementação
        de renda mínima. Deduza apenas valores de terceiros e repasses legais
        obrigatórios — não deduza custeio, pessoal, investimento nem tributos.
      </p>
      <Field
        label="Onde fica o sistema que o cartório usa no dia a dia?"
        htmlFor="nd-modelo"
      >
        <select
          id="nd-modelo"
          className={selectClass}
          value={modelo}
          onChange={(e) => setModelo(e.target.value as DiagnosticoModelo)}
        >
          {(Object.keys(MODELO_LABEL) as DiagnosticoModelo[]).map((m) => (
            <option key={m} value={m}>
              {MODELO_LABEL[m]}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Responsável *" htmlFor="nd-contato">
          <Input
            id="nd-contato"
            value={contatoNome}
            onChange={(e) => setContatoNome(e.target.value)}
            placeholder="Titular/interino"
          />
        </Field>
        <Field label="E-mail" htmlFor="nd-email">
          <Input
            id="nd-email"
            type="email"
            value={contatoEmail}
            onChange={(e) => setContatoEmail(e.target.value)}
          />
        </Field>
        <Field label="WhatsApp" htmlFor="nd-whats">
          <Input
            id="nd-whats"
            value={contatoWhatsapp}
            onChange={(e) => setContatoWhatsapp(e.target.value)}
            placeholder="(84) 9…"
          />
        </Field>
      </div>
      <Field label="Escopo do diagnóstico" htmlFor="nd-escopo">
        <select
          id="nd-escopo"
          className={selectClass}
          value={escopo}
          onChange={(e) => setEscopo(e.target.value as DiagnosticoEscopo)}
        >
          {(Object.keys(ESCOPO_LABEL) as DiagnosticoEscopo[]).map((s) => (
            <option key={s} value={s}>
              {ESCOPO_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>
      {error && <p className="text-xs leading-[1.4] text-danger">{error}</p>}
      <div className="flex justify-end gap-[9px] border-t border-line pt-3.5">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.push("/diagnosticos")}
        >
          Cancelar
        </Button>
        <Button size="lg" onClick={submit} disabled={pending}>
          {pending ? "Criando…" : "Iniciar entrevista"}
        </Button>
      </div>
    </div>
  );
}
