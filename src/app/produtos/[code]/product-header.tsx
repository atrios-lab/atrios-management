"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@/components/icons";
import { Button, Sheet, StatusPill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { STAGES } from "@/lib/product-constants";
import { useIsMobile } from "@/lib/use-is-mobile";
import { EditProductModal } from "./edit-product-modal";
import { ContextPanel, type ContextProduct } from "./product-context";

const CONTEXT_KEY = "atrios.productContextOpen";

export interface ProductHeaderProps {
  productId: string;
  name: string;
  code: string;
  stage: number;
  cardCount: number;
  accessCount: number;
  documentCount: number;
  active: "cards" | "acessos" | "documentos";
  description: string;
  longDescription: string | null;
  /** Detalhes do produto, exibidos entre o nome e as abas (toggle Contexto). */
  context?: ContextProduct;
}

/** Breadcrumb + identidade do produto + contexto + abas Cards|Acessos. */
export function ProductHeader({
  productId,
  name,
  code,
  stage: stageIndex,
  cardCount,
  accessCount,
  documentCount,
  active,
  description,
  longDescription,
  context,
}: ProductHeaderProps) {
  const stage = STAGES[stageIndex] ?? STAGES[0];
  const isMobile = useIsMobile();
  const [contextOpen, setContextOpen] = useState(false);
  // No mobile o contexto abre sob demanda como bottom sheet (M04b) — sem persistência.
  const [contextSheet, setContextSheet] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONTEXT_KEY);
    if (saved !== null) setContextOpen(saved === "1");
  }, []);

  const toggleContext = () => {
    if (isMobile) {
      setContextSheet(true);
      return;
    }
    const next = !contextOpen;
    setContextOpen(next);
    localStorage.setItem(CONTEXT_KEY, next ? "1" : "0");
  };

  const tabs = [
    {
      key: "cards",
      label: "Cards",
      count: cardCount,
      href: `/produtos/${code}`,
    },
    {
      key: "acessos",
      label: "Acessos",
      count: accessCount,
      href: `/produtos/${code}/acessos`,
    },
    {
      key: "documentos",
      label: "Documentos",
      count: documentCount,
      href: `/produtos/${code}/documentos`,
    },
  ] as const;

  return (
    <>
      {/* breadcrumb (desktop) / voltar (mobile) */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line-subtle px-4 md:px-[22px]">
        <Link
          href="/produtos"
          className="flex min-h-11 items-center gap-1.5 text-[14px] text-fg-6 transition-colors duration-200 hover:text-fg-3 md:min-h-0 md:text-[12.5px]"
        >
          <span className="md:hidden">
            <ArrowLeftIcon size={13} />
          </span>
          Produtos
        </Link>
        <span className="hidden text-fg-9 md:inline">
          <ChevronRightIcon />
        </span>
        <span className="hidden truncate text-[12.5px] text-fg-5 md:inline">
          {name}
        </span>
      </div>

      {/* product header + contexto + tabs */}
      <div className="shrink-0 border-b border-line-subtle px-4 pt-4 md:px-[22px] md:pt-[22px]">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 md:gap-[13px]">
          <span
            className="size-[11px] shrink-0 rounded-full"
            style={{
              background: stage.color,
              boxShadow: `0 0 12px ${stage.color}88`,
            }}
          />
          <h1 className="text-[21px] font-semibold tracking-[-0.02em] text-fg-hi md:text-[25px]">
            {name}
          </h1>
          <span className="rounded-nav border border-line-strong bg-white/[0.06] px-[9px] py-0.5 font-mono text-xs font-semibold tracking-[0.04em] text-fg-4">
            {code}
          </span>
          <StatusPill hue={stage.hue}>{stage.name}</StatusPill>
          <div className="ml-auto" />
          <EditProductModal
            productId={productId}
            name={name}
            description={description}
            longDescription={longDescription}
          />
          {context && (
            <Button variant="secondary" size="md" onClick={toggleContext}>
              Contexto
              <span
                className="transition-transform duration-200"
                style={
                  contextOpen && !isMobile
                    ? undefined
                    : { transform: "rotate(-90deg)" }
                }
              >
                <ChevronDownIcon />
              </span>
            </Button>
          )}
        </div>
        {context && contextOpen && (
          <div className="hidden md:block">
            <ContextPanel product={context} />
          </div>
        )}
        <div className="-mx-4 mt-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
          <div className="flex items-end gap-5 whitespace-nowrap">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={cn(
                  "inline-flex items-center gap-1.5 border-b-2 px-0.5 pb-2.5 text-[14px] transition-colors duration-200 md:text-[12.5px]",
                  tab.key === active
                    ? "border-primary font-semibold text-fg-2"
                    : "border-transparent font-medium text-fg-6 hover:text-fg-3",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "text-[11px]",
                    tab.key === active ? "text-fg-6" : "text-fg-9",
                  )}
                >
                  {tab.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* contexto como bottom sheet (mobile, M04b) */}
      {context && contextSheet && (
        <Sheet
          mode="bottom"
          ariaLabel="Contexto do produto"
          onClose={() => setContextSheet(false)}
          panelClassName="md:w-[640px] md:max-w-[92vw]"
        >
          <div className="flex items-center gap-2.5 px-5 pb-1 pt-2">
            <span
              className="size-[9px] shrink-0 rounded-full"
              style={{ background: stage.color }}
            />
            <span className="text-[16px] font-semibold text-fg-1">
              Contexto
            </span>
            <span className="font-mono text-[11px] text-fg-7">{code}</span>
          </div>
          <ContextPanel product={context} inSheet />
        </Sheet>
      )}
    </>
  );
}
