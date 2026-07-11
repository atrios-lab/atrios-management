"use client";

import { useState, useTransition } from "react";
import { CloseIcon, ExternalIcon, PlusIcon } from "@/components/icons";
import { Button, IconButton, Stepper } from "@/components/ui";
import { repoColor, STAGES } from "@/lib/product-constants";
import { addRepo, removeRepo, setProductStage } from "../actions";

export interface ContextRepo {
  id: string;
  label: string;
  name: string;
}

export interface ContextProduct {
  id: string;
  stage: number;
  description: string;
  longDescription: string | null;
  /** Data formatada em que o produto entrou em cada etapa (por índice). */
  stageDates: (string | null)[];
  repos: ContextRepo[];
}

/**
 * Painel de detalhes do produto, entre o nome e as abas (todas as abas).
 * Com `inSheet`, vira o conteúdo do bottom sheet mobile (M04b): coluna
 * única e stepper vertical.
 */
export function ContextPanel({
  product,
  inSheet = false,
}: {
  product: ContextProduct;
  inSheet?: boolean;
}) {
  const [, startTransition] = useTransition();

  const onStageClick = (index: number) => {
    if (index === product.stage) return;
    startTransition(async () => {
      await setProductStage(product.id, index);
    });
  };

  const stepper = (
    <Stepper
      vertical={inSheet}
      steps={STAGES.map((s, i) => ({
        name: s.name,
        color: s.color,
        date: product.stageDates[i] ?? undefined,
      }))}
      current={product.stage}
      onStepClick={onStageClick}
    />
  );

  if (inSheet) {
    return (
      <div className="flex flex-col gap-[22px] px-5 pb-6 pt-4">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
            Descrição
          </div>
          <p className="text-[14px] leading-relaxed text-fg-4">
            {product.longDescription ?? product.description}
          </p>
        </div>
        <RepoSection product={product} />
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
            Etapa
          </div>
          {stepper}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-[18px] flex flex-col gap-[22px] border-t border-[rgba(255,255,255,0.055)] pb-7 pt-[18px]">
      <div className="flex flex-wrap gap-10">
        <div className="min-w-[320px] flex-1">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
            Descrição
          </div>
          <p className="max-w-[560px] text-[13.5px] leading-relaxed text-fg-4">
            {product.longDescription ?? product.description}
          </p>
        </div>
        <RepoSection product={product} />
      </div>
      <div>
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
          Etapa
        </div>
        {stepper}
      </div>
    </div>
  );
}

/* ---- Repositórios ------------------------------------------------------- */

function RepoSection({ product }: { product: ContextProduct }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!label.trim() || !name.trim() || pending) return;
    startTransition(async () => {
      const result = await addRepo(product.id, label, name);
      if (!result.error) {
        setLabel("");
        setName("");
        setAdding(false);
      }
    });
  };

  return (
    <div className="min-w-[240px]">
      <div className="mb-[9px] text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
        Repositórios
      </div>
      <div className="flex flex-col gap-[7px]">
        {product.repos.map((r) => (
          <div
            key={r.id}
            className="group flex h-[34px] items-center gap-[9px] rounded-field border border-[rgba(255,255,255,0.09)] bg-surface-1 pl-[11px] pr-1.5 transition-colors duration-200 hover:border-line-hover hover:bg-[#0e0f12]"
          >
            <span
              className="size-[7px] shrink-0 rounded-full"
              style={{ background: repoColor(r.label) }}
            />
            <a
              href={`https://github.com/atrios/${r.name}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 flex-1 items-center gap-[9px] font-mono text-[12.5px] text-fg-2"
            >
              <span className="truncate">
                <span className="text-fg-8">atrios/</span>
                {r.name}
              </span>
              <span className="ml-auto shrink-0 text-fg-7">
                <ExternalIcon />
              </span>
            </a>
            <IconButton
              aria-label={`Remover repositório ${r.name}`}
              size={22}
              className="opacity-0 transition-opacity duration-200 hover:text-danger group-hover:opacity-100"
              onClick={() =>
                startTransition(async () => {
                  await removeRepo(r.id);
                })
              }
            >
              <CloseIcon />
            </IconButton>
          </div>
        ))}
        {adding ? (
          <div className="flex items-center gap-1.5">
            <input
              aria-label="Papel do repositório"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="papel"
              className="h-[30px] w-[88px] shrink-0 rounded-nav border border-line-field-strong bg-surface-1 px-2 text-xs text-fg-2 outline-none placeholder:text-fg-8"
            />
            <div className="flex h-[30px] min-w-0 flex-1 items-center rounded-nav border border-line-field-strong bg-surface-1 px-2 font-mono text-xs text-fg-2">
              <span className="text-fg-8">atrios/</span>
              <input
                aria-label="Nome do repositório"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") setAdding(false);
                }}
                className="w-full min-w-0 bg-transparent outline-none"
              />
            </div>
            <Button size="sm" onClick={submit} disabled={pending}>
              Salvar
            </Button>
          </div>
        ) : (
          <Button
            variant="dashed"
            size={product.repos.length ? "md" : "lg"}
            icon={<PlusIcon size={12} />}
            className="self-start"
            onClick={() => setAdding(true)}
          >
            Adicionar repositório
          </Button>
        )}
      </div>
    </div>
  );
}
