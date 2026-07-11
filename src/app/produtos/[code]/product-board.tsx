"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArchiveIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CloseIcon,
  CopyIcon,
  ExternalIcon,
  GitGraphIcon,
  KanbanIcon,
  ListIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { RealtimeIndicator } from "@/components/realtime-indicator";
import {
  Badge,
  Button,
  IconButton,
  RepoChip,
  SegmentedControl,
  Sheet,
  TaskCard,
} from "@/components/ui";
import type { CardStatus } from "@/db/schema";
import { cn } from "@/lib/cn";
import {
  BOARD_COLUMNS,
  displayCardId,
  repoColor,
  suggestBranch,
} from "@/lib/product-constants";
import { channels, type RealtimeEvent } from "@/lib/realtime/types";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { useIsMobile } from "@/lib/use-is-mobile";
import {
  archiveCard,
  archiveDoneCards,
  createCard,
  deleteCard,
  linkPr,
  setCardStatus,
  unlinkPr,
  updateCard,
} from "../actions";
import { ProductHeader } from "./product-header";

export interface BoardRepo {
  id: string;
  label: string;
  name: string;
}

export interface BoardCard {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  status: CardStatus;
  repoId: string | null;
  prNumber: number | null;
  prUrl: string | null;
  auto: boolean;
  archived: boolean;
}

export interface BoardProduct {
  id: string;
  name: string;
  code: string;
  stage: number;
  description: string;
  longDescription: string | null;
  /** Data formatada em que o produto entrou em cada etapa (por índice). */
  stageDates: (string | null)[];
  repos: BoardRepo[];
}

export function ProductBoard({
  product,
  cards,
  accessCount,
  documentCount,
  currentUserId,
}: {
  product: BoardProduct;
  cards: BoardCard[];
  accessCount: number;
  documentCount: number;
  currentUserId: string;
}) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [view, setView] = useState("kanban");
  const [composing, setComposing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  // Destaque "novo" é só desta sessão do browser (não persiste).
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();
  // Drag-and-drop do kanban (só nesta visão).
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<CardStatus | null>(null);
  // Override otimista de status; a revalidação descarta ao trazer os props novos.
  const [optimisticCards, moveCardOptimistic] = useOptimistic(
    cards,
    (state, { id, status }: { id: string; status: CardStatus }) =>
      state.map((c) => (c.id === id ? { ...c, status } : c)),
  );

  // Realtime: eventos de outros usuários ressincronizam o board via refresh.
  // Espelha o drag num ref para não recarregar no meio de uma interação; um
  // refresh que chega durante o drag fica pendente e dispara ao soltar.
  const draggingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resync = useCallback(() => {
    if (draggingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 250);
  }, [router]);

  const onRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      // ignora o eco da própria ação (o autor já teve o revalidatePath)
      if (event.actorId === currentUserId) return;
      resync();
    },
    [currentUserId, resync],
  );

  const realtimeStatus = useRealtime(
    channels.product(product.id),
    onRealtimeEvent,
    resync,
  );

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  const activeCards = optimisticCards.filter((c) => !c.archived);
  const archivedCards = optimisticCards.filter((c) => c.archived);
  const columns = BOARD_COLUMNS.map((col) => ({
    ...col,
    cards: activeCards.filter((c) => c.status === col.status),
  }));
  const selected = cards.find((c) => c.id === selectedId) ?? null;
  const repoOf = (c: BoardCard) => product.repos.find((r) => r.id === c.repoId);
  const nextSeq = cards.reduce((m, c) => Math.max(m, c.seq), 0) + 1;

  const endDrag = () => {
    draggingRef.current = false;
    setDraggingId(null);
    setDragOverCol(null);
    // Aplica um refresh que tenha chegado durante o drag.
    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      resync();
    }
  };

  const dropOnColumn = (status: CardStatus, id: string) => {
    endDrag();
    if (!id) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status) return; // mesma coluna: no-op
    startTransition(async () => {
      moveCardOptimistic({ id, status });
      await setCardStatus(id, status);
    });
  };

  const onCreateCard = (title: string, repoId?: string) => {
    setComposing(false);
    startTransition(async () => {
      const result = await createCard(product.id, title, repoId);
      if (result.id) {
        const id = result.id;
        setNewIds((prev) => new Set(prev).add(id));
      }
    });
  };

  const onArchiveDone = () => {
    if (!confirm("Arquivar todos os cards concluídos?")) return;
    startTransition(async () => {
      await archiveDoneCards(product.id);
    });
  };

  return (
    <>
      <ProductHeader
        productId={product.id}
        name={product.name}
        code={product.code}
        stage={product.stage}
        cardCount={activeCards.length}
        accessCount={accessCount}
        documentCount={documentCount}
        active="cards"
        description={product.description}
        longDescription={product.longDescription}
        context={{
          id: product.id,
          stage: product.stage,
          description: product.description,
          longDescription: product.longDescription,
          stageDates: product.stageDates,
          repos: product.repos,
        }}
      />

      {/* board */}
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-5 pb-5 pt-4">
        <div className="flex shrink-0 items-center gap-2.5">
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: "kanban", label: "Kanban", icon: <KanbanIcon /> },
              { value: "list", label: "Lista", icon: <ListIcon /> },
            ]}
          />
          {archivedCards.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-nav border border-line-field-strong bg-surface-1 px-2.5 py-1.5 text-xs text-fg-6 transition-colors duration-150 hover:text-fg-2"
            >
              <ArchiveIcon size={12} />
              Arquivados
              <span className="rounded-pill bg-white/[0.06] px-[7px] text-[11px] font-semibold text-fg-6">
                {archivedCards.length}
              </span>
            </button>
          )}
        </div>

        {view === "kanban" ? (
          // Mobile (estilo Todoist): uma coluna por vez, snap por coluna,
          // com a próxima aparecendo parcialmente à direita.
          <div className="flex min-h-0 flex-1 gap-3.5 max-md:-mx-4 max-md:snap-x max-md:snap-mandatory max-md:scroll-pl-4 max-md:overflow-x-auto max-md:px-4 max-md:scrollbar-none">
            {columns.map((col) => (
              <div
                key={col.status}
                className="flex flex-col gap-[11px] max-md:w-[302px] max-md:shrink-0 max-md:snap-start md:min-w-0 md:flex-1"
                onDragOver={(e) => {
                  // sempre preventDefault no alvo: garante que o drop seja aceito
                  // mesmo antes de o estado draggingId ter feito flush.
                  e.preventDefault();
                  if (dragOverCol !== col.status) setDragOverCol(col.status);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  // id do dataTransfer é confiável no drop; estado é fallback.
                  const id = e.dataTransfer.getData("text/plain") || draggingId;
                  if (id) dropOnColumn(col.status, id);
                }}
              >
                <div className="flex shrink-0 items-center gap-2 px-[3px]">
                  <span
                    className="size-[9px] shrink-0 rounded-full"
                    style={{ background: col.color }}
                  />
                  <span className="whitespace-nowrap text-[13px] font-semibold text-fg-3">
                    {col.title}
                  </span>
                  <span className="text-xs text-fg-9">{col.cards.length}</span>
                  {col.status === "todo" && (
                    <IconButton
                      aria-label="Novo card"
                      size={22}
                      className="ml-auto"
                      onClick={() => setComposing(true)}
                    >
                      <PlusIcon size={14} />
                    </IconButton>
                  )}
                  {col.status === "done" && col.cards.length > 0 && (
                    <IconButton
                      aria-label="Arquivar concluídos"
                      size={22}
                      className="ml-auto"
                      onClick={onArchiveDone}
                    >
                      <ArchiveIcon size={13} />
                    </IconButton>
                  )}
                </div>
                <div
                  className={cn(
                    "flex flex-1 flex-col gap-2 overflow-auto rounded-field border border-transparent transition-colors duration-150",
                    dragOverCol === col.status &&
                      draggingId &&
                      "border-dashed border-primary/45 bg-surface-selected/40",
                  )}
                >
                  {col.status === "todo" && composing && !isMobile && (
                    <CardComposer
                      nextId={displayCardId(product.code, nextSeq)}
                      repos={product.repos}
                      onCreate={onCreateCard}
                      onCancel={() => setComposing(false)}
                    />
                  )}
                  {col.cards.map((card) => (
                    <TaskCard
                      key={card.id}
                      id={displayCardId(product.code, card.seq)}
                      title={card.title}
                      repo={repoOf(card)?.label}
                      prNum={card.prNumber ?? undefined}
                      auto={card.auto}
                      isNew={newIds.has(card.id)}
                      draggable
                      onDragStart={(e) => {
                        // estado primeiro: é a fonte de verdade do drop (dataTransfer é só cosmético)
                        draggingRef.current = true;
                        setDraggingId(card.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", card.id);
                      }}
                      onDragEnd={endDrag}
                      className={cn(
                        "cursor-grab active:cursor-grabbing",
                        draggingId === card.id && "opacity-40",
                        newIds.has(card.id) &&
                          "border-primary/40 bg-surface-selected shadow-glow-new",
                      )}
                      onClick={() => setSelectedId(card.id)}
                    />
                  ))}
                  {col.status === "todo" && !composing && (
                    <button
                      type="button"
                      onClick={() => setComposing(true)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-field border border-dashed border-white/10 bg-transparent px-[11px] py-2 text-left text-[12.5px] text-fg-7 transition-colors duration-200 hover:border-primary/45 hover:text-primary-fg"
                    >
                      <PlusIcon size={12} />
                      Novo card
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-surface-1">
            {columns.map((col) => (
              <div key={col.status}>
                <div className="flex items-center gap-[9px] border-b border-line-subtle bg-surface-4 px-4 py-[9px]">
                  <span className="text-fg-7">
                    <ChevronDownIcon size={12} />
                  </span>
                  <span
                    className="size-[9px] shrink-0 rounded-full"
                    style={{ background: col.color }}
                  />
                  <span className="text-[12.5px] font-semibold text-fg-3">
                    {col.title}
                  </span>
                  <span className="rounded-pill bg-white/[0.06] px-[7px] text-[11px] font-semibold text-fg-6">
                    {col.cards.length}
                  </span>
                  {col.status === "todo" && (
                    <IconButton
                      aria-label="Novo card"
                      size={22}
                      className="ml-auto"
                      onClick={() => {
                        setView("kanban");
                        setComposing(true);
                      }}
                    >
                      <PlusIcon size={13} />
                    </IconButton>
                  )}
                  {col.status === "done" && col.cards.length > 0 && (
                    <IconButton
                      aria-label="Arquivar concluídos"
                      size={22}
                      className="ml-auto"
                      onClick={onArchiveDone}
                    >
                      <ArchiveIcon size={13} />
                    </IconButton>
                  )}
                </div>
                {col.cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedId(card.id)}
                    className="flex w-full cursor-pointer items-center gap-3 border-b border-line-subtle py-2.5 pl-[18px] pr-4 text-left transition-colors duration-200 hover:bg-white/[0.022]"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: col.color }}
                    />
                    <span className="min-w-[58px] shrink-0 font-mono text-[11.5px] text-fg-7">
                      {displayCardId(product.code, card.seq)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-fg-2">
                      {card.title}
                    </span>
                    {card.auto && (
                      <Badge
                        tone="primary"
                        pulse
                        icon={<GitGraphIcon size={9} />}
                      >
                        auto
                      </Badge>
                    )}
                    {repoOf(card) && (
                      <RepoChip
                        name={repoOf(card)?.label}
                        color={repoColor(repoOf(card)?.label ?? "")}
                      />
                    )}
                    {card.prNumber && (
                      <Badge tone="neutral" mono icon={<GitGraphIcon />}>
                        #{card.prNumber}
                      </Badge>
                    )}
                  </button>
                ))}
                {col.status === "todo" && (
                  <button
                    type="button"
                    onClick={() => {
                      setView("kanban");
                      setComposing(true);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 border-b border-line-subtle py-[9px] pl-[18px] pr-4 text-left text-[12.5px] text-fg-7 transition-colors duration-200 hover:bg-white/[0.015] hover:text-primary-fg"
                  >
                    <PlusIcon size={12} />
                    Novo card
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {composing && isMobile && (
        <CardComposerSheet
          nextId={displayCardId(product.code, nextSeq)}
          repos={product.repos}
          onCreate={onCreateCard}
          onCancel={() => setComposing(false)}
        />
      )}

      {selected && (
        <CardPanel
          key={selected.id}
          card={selected}
          product={product}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showArchived && (
        <ArchivedPanel
          cards={archivedCards}
          product={product}
          onClose={() => setShowArchived(false)}
        />
      )}

      <RealtimeIndicator status={realtimeStatus} />
    </>
  );
}

/* ---- Card composer (screen 05) ---------------------------------------- */

function CardComposer({
  nextId,
  repos,
  onCreate,
  onCancel,
}: {
  nextId: string;
  repos: BoardRepo[];
  onCreate: (title: string, repoId?: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [repoId, setRepoId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = () => {
    if (title.trim()) onCreate(title.trim(), repoId || undefined);
  };

  return (
    <div className="flex flex-col gap-[11px] rounded-field border border-primary/60 bg-surface-selected p-[11px] [box-shadow:0_0_0_3px_rgba(94,106,210,0.13)]">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Título do card"
        className="w-full bg-transparent text-[13.5px] leading-[1.4] text-[#ececed] outline-none placeholder:text-fg-8"
      />
      <div className="flex items-center gap-2">
        <select
          aria-label="Repositório"
          value={repoId}
          onChange={(e) => setRepoId(e.target.value)}
          className="h-[27px] cursor-pointer rounded-nav border border-line-field-strong bg-surface-1 px-[9px] text-xs text-fg-3 outline-none"
        >
          <option value="">sem repo</option>
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <span className="ml-auto font-mono text-[11px] text-fg-9">
          {nextId}
        </span>
      </div>
      <div className="flex items-center gap-2 border-t border-[rgba(255,255,255,0.07)] pt-2.5">
        <span className="text-[11px] text-fg-9">Enter cria · Esc cancela</span>
        <div className="ml-auto flex gap-[7px]">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit}>
            Criar
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---- Compositor mobile (M05) — sheet fixado na base, padrão Todoist ---- */

function CardComposerSheet({
  nextId,
  repos,
  onCreate,
  onCancel,
}: {
  nextId: string;
  repos: BoardRepo[];
  onCreate: (title: string, repoId?: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [repoId, setRepoId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = () => {
    if (title.trim()) onCreate(title.trim(), repoId || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Cancelar"
        className="absolute inset-0 cursor-default bg-[rgba(4,5,7,0.5)]"
        onClick={onCancel}
      />
      <div className="absolute inset-x-0 bottom-0 animate-sheet-up rounded-t-[20px] border-t border-white/12 bg-surface-raised px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Título do card"
          className="w-full bg-transparent text-base text-[#ececed] outline-none placeholder:text-fg-8"
        />
        <div className="mt-3.5 flex items-center gap-2.5">
          <select
            aria-label="Repositório"
            value={repoId}
            onChange={(e) => setRepoId(e.target.value)}
            className="h-9 cursor-pointer rounded-pill border border-line-field-strong bg-surface-1 px-3 text-[13px] text-fg-3 outline-none"
          >
            <option value="">sem repo</option>
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="font-mono text-[11.5px] text-fg-9">{nextId}</span>
          <button
            type="button"
            aria-label="Criar card"
            disabled={!title.trim()}
            onClick={submit}
            className="ml-auto flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-brand transition-colors duration-150 active:bg-primary-hover disabled:cursor-default disabled:opacity-45"
          >
            <ArrowUpIcon size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Card panel (screen 06) -------------------------------------------- */

function CardPanel({
  card,
  product,
  onClose,
}: {
  card: BoardCard;
  product: BoardProduct;
  onClose: () => void;
}) {
  const displayId = displayCardId(product.code, card.seq);
  const branch = suggestBranch(displayId, card.title);
  const column =
    BOARD_COLUMNS.find((c) => c.status === card.status) ?? BOARD_COLUMNS[0];

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [prInput, setPrInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await fn();
      setError(result.error ?? null);
    });
  };

  const saveTitle = () => {
    if (title.trim() && title.trim() !== card.title)
      run(() => updateCard(card.id, { title }));
    else setTitle(card.title);
  };

  const saveDescription = () => {
    if (description.trim() !== (card.description ?? ""))
      run(() => updateCard(card.id, { description }));
  };

  const archiveThis = () => {
    startTransition(async () => {
      const result = await archiveCard(card.id, true);
      if (result.error) setError(result.error);
      else onClose();
    });
  };

  return (
    <>
      <Sheet
        mode="bottom"
        ariaLabel={displayId}
        onClose={onClose}
        panelClassName="md:w-[720px] md:max-w-[92vw]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 md:px-[18px] md:py-3.5">
          <span className="rounded-chip bg-white/5 px-[7px] py-0.5 font-mono text-xs text-fg-6">
            {displayId}
          </span>
          <select
            aria-label="Status do card"
            value={card.status}
            onChange={(e) =>
              run(() => setCardStatus(card.id, e.target.value as CardStatus))
            }
            className="h-[27px] cursor-pointer rounded-pill border border-line-field-strong bg-surface-1 px-[9px] text-xs font-medium outline-none"
            style={{ color: column.color }}
          >
            {BOARD_COLUMNS.map((c) => (
              <option key={c.status} value={c.status}>
                {c.title}
              </option>
            ))}
          </select>
          <div className="ml-auto" />
          {card.status === "done" && (
            <IconButton
              aria-label="Arquivar card"
              className="hover:text-primary-fg"
              disabled={pending}
              onClick={archiveThis}
            >
              <ArchiveIcon size={15} />
            </IconButton>
          )}
          <IconButton
            aria-label="Excluir card"
            className="hover:text-danger"
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon size={15} />
          </IconButton>
          <IconButton
            aria-label="Fechar"
            className="max-md:hidden"
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </IconButton>
        </div>
        <div className="flex flex-col md:flex-row">
          <div className="min-w-0 flex-1 border-line px-4 py-5 md:border-r md:px-5 md:py-[22px]">
            <input
              aria-label="Título do card"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="mb-[18px] w-full bg-transparent text-[19px] font-semibold leading-[1.3] tracking-[-0.01em] text-fg-hi outline-none"
            />
            <div className="mb-[9px] text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
              Descrição
            </div>
            <textarea
              aria-label="Descrição do card"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Sem descrição."
              rows={6}
              className="w-full resize-none bg-transparent text-[13.5px] leading-[1.65] text-fg-4 outline-none placeholder:text-fg-8"
            />
          </div>
          <div className="flex w-full shrink-0 flex-col gap-5 border-t border-line px-4 py-5 md:w-[264px] md:border-t-0 md:px-5 md:py-[22px]">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
                Repositório
              </span>
              <div className="flex h-9 items-center gap-2 rounded-field border border-line-field bg-surface-1 px-[11px]">
                {card.repoId && (
                  <span
                    className="size-[7px] shrink-0 rounded-full"
                    style={{
                      background: repoColor(
                        product.repos.find((r) => r.id === card.repoId)
                          ?.label ?? "",
                      ),
                    }}
                  />
                )}
                <select
                  aria-label="Repositório do card"
                  value={card.repoId ?? ""}
                  onChange={(e) =>
                    run(() =>
                      updateCard(card.id, { repoId: e.target.value || null }),
                    )
                  }
                  className="w-full cursor-pointer bg-transparent text-[13px] text-fg-2 outline-none"
                >
                  <option value="">sem repo</option>
                  {product.repos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
                Branch sugerida
              </span>
              <div className="flex h-9 items-center gap-2 rounded-field border border-line-field bg-surface-1 py-0 pl-[11px] pr-2">
                <span className="truncate font-mono text-xs text-fg-3">
                  {branch}
                </span>
                <IconButton
                  aria-label="Copiar branch"
                  tinted
                  className="ml-auto hover:bg-primary/25 hover:text-primary-fg-hi"
                  onClick={() => navigator.clipboard?.writeText(branch)}
                >
                  <CopyIcon />
                </IconButton>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-8">
                Pull Request
              </span>
              {card.prNumber ? (
                <div className="flex items-center gap-2 rounded-field border border-status-done/25 bg-status-done/10 py-[5px] pl-[11px] pr-1.5">
                  <a
                    href={card.prUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <span className="text-status-done">
                      <GitGraphIcon size={14} />
                    </span>
                    <span className="font-mono text-[12.5px] text-fg-2">
                      #{card.prNumber}
                    </span>
                    <span className="ml-auto shrink-0 text-fg-7">
                      <ExternalIcon />
                    </span>
                  </a>
                  <IconButton
                    aria-label="Remover vínculo do PR"
                    size={22}
                    className="hover:text-danger"
                    onClick={() => run(() => unlinkPr(card.id))}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    aria-label="Link do PR"
                    value={prInput}
                    onChange={(e) => setPrInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      prInput.trim() &&
                      run(() => linkPr(card.id, prInput))
                    }
                    placeholder="Colar link do PR"
                    className="h-8 min-w-0 flex-1 rounded-field border border-dashed border-line-hover bg-transparent px-[11px] text-xs text-fg-3 outline-none placeholder:text-fg-7"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending || !prInput.trim()}
                    onClick={() => run(() => linkPr(card.id, prInput))}
                  >
                    Vincular
                  </Button>
                </div>
              )}
              {error && (
                <span className="text-[11px] leading-[1.4] text-danger">
                  {error}
                </span>
              )}
              <span className="text-[11px] leading-[1.4] text-fg-9">
                Cole o link de um PR do GitHub para vincular ao card.
              </span>
            </div>
          </div>
        </div>
      </Sheet>
      {confirmDelete && (
        <DeleteCardConfirm
          displayId={displayId}
          pending={pending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            startTransition(async () => {
              const result = await deleteCard(card.id);
              if (result.error) {
                setError(result.error);
                setConfirmDelete(false);
                return;
              }
              onClose();
            });
          }}
        />
      )}
    </>
  );
}

/* ---- Confirmação de exclusão ------------------------------------------- */

function DeleteCardConfirm({
  displayId,
  pending,
  onCancel,
  onConfirm,
}: {
  displayId: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet
      mode="bottom"
      title="Excluir card"
      onClose={onCancel}
      action={{
        label: pending ? "Excluindo…" : "Excluir",
        onClick: onConfirm,
        disabled: pending,
        destructive: true,
      }}
      panelClassName="md:w-[380px]"
    >
      <p className="p-4 text-[13.5px] leading-[1.55] text-fg-5 md:p-[18px] md:text-[13px]">
        O card {displayId} será excluído permanentemente. Essa ação não tem
        volta.
      </p>
    </Sheet>
  );
}

/* ---- Cards arquivados --------------------------------------------------- */

function ArchivedPanel({
  cards,
  product,
  onClose,
}: {
  cards: BoardCard[];
  product: BoardProduct;
  onClose: () => void;
}) {
  const [, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const restore = (id: string) => {
    startTransition(async () => {
      await archiveCard(id, false);
    });
  };

  const remove = (id: string) => {
    if (!confirm("Excluir este card permanentemente?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteCard(id);
      setDeletingId(null);
    });
  };

  return (
    <Sheet
      mode="bottom"
      ariaLabel="Cards arquivados"
      onClose={onClose}
      panelClassName="md:w-[480px] md:max-w-[92vw]"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 md:px-[18px] md:py-3.5">
        <span className="text-[15px] font-semibold text-fg-1 md:text-[14.5px]">
          Cards arquivados
        </span>
        <div className="ml-auto" />
        <IconButton
          aria-label="Fechar"
          className="max-md:hidden"
          onClick={onClose}
        >
          <CloseIcon size={16} />
        </IconButton>
      </div>
      <div>
        {cards.length === 0 ? (
          <p className="p-[18px] text-[13px] text-fg-7">
            Nenhum card arquivado.
          </p>
        ) : (
          cards.map((card) => {
            const column =
              BOARD_COLUMNS.find((c) => c.status === card.status) ??
              BOARD_COLUMNS[0];
            return (
              <div
                key={card.id}
                className="flex items-center gap-2.5 border-b border-line-subtle px-[18px] py-2.5"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: column.color }}
                />
                <span className="min-w-[58px] shrink-0 font-mono text-[11.5px] text-fg-7">
                  {displayCardId(product.code, card.seq)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-fg-2">
                  {card.title}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => restore(card.id)}
                >
                  Restaurar
                </Button>
                <IconButton
                  aria-label="Excluir card"
                  className="hover:text-danger"
                  disabled={deletingId === card.id}
                  onClick={() => remove(card.id)}
                >
                  <TrashIcon size={14} />
                </IconButton>
              </div>
            );
          })
        )}
      </div>
    </Sheet>
  );
}
