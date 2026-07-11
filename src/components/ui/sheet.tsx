"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { IconButton } from "./icon-button";

export interface SheetAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Ação vermelha (excluir). */
  destructive?: boolean;
}

export interface SheetProps {
  /**
   * `bottom` — sheet ancorado embaixo (detalhes, contexto, convites).
   * `fullscreen` — sheet de tela cheia (formulários longos).
   * No desktop (≥768px) ambos viram o modal centralizado padrão.
   */
  mode?: "bottom" | "fullscreen";
  onClose: () => void;
  ariaLabel?: string;
  /**
   * Com `title` o Sheet renderiza o chrome completo: no mobile, header
   * `Cancelar · Título · Ação`; no desktop, header título+X e footer com
   * Cancelar + ação primária. Sem `title`, só o casco — os filhos trazem
   * o próprio header (ex.: painel do card).
   */
  title?: string;
  action?: SheetAction;
  cancelLabel?: string;
  /** Conteúdo à esquerda do footer desktop (notas de rodapé). */
  footerStart?: React.ReactNode;
  /** Classes do painel — passe a largura desktop (ex.: `md:w-[520px]`). */
  panelClassName?: string;
  children: React.ReactNode;
}

export function Sheet({
  mode = "bottom",
  onClose,
  ariaLabel,
  title,
  action,
  cancelLabel = "Cancelar",
  footerStart,
  panelClassName,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; delta: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Drag-to-dismiss: arrastar o grabber/header para baixo fecha. */
  const onTouchStart = (e: React.TouchEvent) => {
    drag.current = { startY: e.touches[0].clientY, delta: 0 };
    if (panelRef.current) panelRef.current.style.transition = "none";
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current) return;
    const delta = Math.max(0, e.touches[0].clientY - drag.current.startY);
    drag.current.delta = delta;
    if (panelRef.current)
      panelRef.current.style.transform = `translateY(${delta}px)`;
  };
  const onTouchEnd = () => {
    const delta = drag.current?.delta ?? 0;
    drag.current = null;
    const el = panelRef.current;
    if (!el) return;
    el.style.transition = "";
    if (delta > 90) onClose();
    else el.style.transform = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[rgba(4,5,7,0.62)] backdrop-blur-[1px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label={ariaLabel ?? title}
        className={cn(
          "relative flex w-full flex-col overflow-hidden bg-surface-card transition-transform duration-200",
          "max-md:animate-sheet-up max-md:rounded-t-[20px] max-md:border-t max-md:border-white/12",
          "md:rounded-panel md:border md:border-white/10 md:shadow-modal",
          mode === "bottom"
            ? "max-h-[88dvh] md:max-h-[85vh]"
            : "h-[calc(100dvh-56px)] md:h-auto md:max-h-[92vh]",
          panelClassName,
        )}
      >
        {/* grabber + header mobile (zona de arrasto) */}
        <div
          className="shrink-0 md:hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-white/15" />
          {title ? (
            <div className="relative mt-1 flex h-[50px] items-center justify-between border-b border-line px-4">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer py-2 pr-3 text-[15px] text-fg-5"
              >
                {cancelLabel}
              </button>
              <span className="absolute left-1/2 max-w-[52%] -translate-x-1/2 truncate text-[15px] font-semibold text-fg-1">
                {title}
              </span>
              {action ? (
                <button
                  type="button"
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={cn(
                    "cursor-pointer py-2 pl-3 text-[15px] font-semibold disabled:cursor-default disabled:opacity-45",
                    action.destructive ? "text-danger" : "text-primary-ink",
                  )}
                >
                  {action.label}
                </button>
              ) : (
                <span />
              )}
            </div>
          ) : (
            <div className="h-1.5" />
          )}
        </div>

        {/* header desktop */}
        {title && (
          <div className="hidden shrink-0 items-center border-b border-line px-[18px] py-4 md:flex">
            <span className="text-[14.5px] font-semibold text-fg-1">
              {title}
            </span>
            <IconButton
              aria-label="Fechar"
              className="ml-auto"
              onClick={onClose}
            >
              <CloseIcon size={16} />
            </IconButton>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] md:pb-0">
          {children}
        </div>

        {/* footer desktop */}
        {title && action && (
          <div className="hidden shrink-0 items-center gap-[9px] border-t border-line px-[18px] py-3.5 md:flex">
            {footerStart}
            <div className="ml-auto" />
            <Button variant="secondary" size="lg" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              size="lg"
              disabled={action.disabled}
              onClick={action.onClick}
              className={
                action.destructive ? "bg-danger hover:bg-[#e57f7f]" : undefined
              }
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
