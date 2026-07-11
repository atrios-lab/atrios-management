"use client";

import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  AccessDetail,
  AccessModal,
  type AccessRow,
  AccessRowItem,
  type VaultProductOption,
} from "./vault-ui";

export function VaultGlobal({
  accesses,
  products,
  isAdmin,
}: {
  accesses: AccessRow[];
  products: VaultProductOption[];
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | "edit" | null>(null);

  // Produtos que têm ao menos um acesso, na ordem em que aparecem.
  const filterTabs = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const a of accesses)
      if (!seen.has(a.productId))
        seen.set(a.productId, { id: a.productId, name: a.productName });
    return [...seen.values()];
  }, [accesses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accesses.filter((a) => {
      if (productFilter !== "all" && a.productId !== productFilter)
        return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) || a.login.toLowerCase().includes(q)
      );
    });
  }, [accesses, productFilter, query]);

  const groups = useMemo(() => {
    const byProduct = new Map<string, AccessRow[]>();
    for (const a of filtered) {
      const list = byProduct.get(a.productId) ?? [];
      list.push(a);
      byProduct.set(a.productId, list);
    }
    return [...byProduct.values()].map((items) => ({
      product: items[0],
      items,
    }));
  }, [filtered]);

  const openRow = openId ? accesses.find((a) => a.id === openId) : null;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-[9px] border-b border-line px-4 md:h-[53px] md:px-5">
        <span className="text-[20px] font-semibold text-fg-1 md:text-sm">
          Cofre
        </span>
        <span className="text-xs text-fg-8">{accesses.length}</span>
        <div className="ml-auto" />
        <Button icon={<PlusIcon />} onClick={() => setModal("new")}>
          <span className="hidden md:inline">Novo acesso</span>
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 p-4 md:p-5">
        <div className="flex shrink-0 flex-col gap-2.5 md:flex-row md:items-center">
          {/* Chips de filtro roláveis no mobile (M16). */}
          <div className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
            <div className="flex w-max gap-0.5 rounded-field border border-line bg-[#0c0d0f] p-0.5">
              <FilterTab
                active={productFilter === "all"}
                onClick={() => setProductFilter("all")}
              >
                Todos
              </FilterTab>
              {filterTabs.map((p) => (
                <FilterTab
                  key={p.id}
                  active={productFilter === p.id}
                  onClick={() => setProductFilter(p.id)}
                >
                  {p.name}
                </FilterTab>
              ))}
            </div>
          </div>
          <div className="flex h-10 items-center gap-2 rounded-field border border-[rgba(255,255,255,0.09)] bg-surface-1 px-[11px] md:ml-auto md:h-8 md:w-[240px]">
            <span className="text-fg-8">
              <SearchIcon />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar acesso…"
              className="min-w-0 flex-1 bg-transparent text-base text-fg-2 outline-none placeholder:text-fg-8 md:text-[12.5px]"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-surface-1">
          {groups.map((g) => (
            <div key={g.product.productId}>
              <div className="flex items-center gap-[9px] border-b border-line-subtle bg-surface-4 px-4 py-[9px]">
                <span
                  className="size-[9px] shrink-0 rounded-full"
                  style={{ background: g.product.productColor }}
                />
                <span className="text-[12.5px] font-semibold text-fg-3">
                  {g.product.productName}
                </span>
                <span className="font-mono text-[11px] text-fg-7">
                  {g.product.productCode}
                </span>
                <span className="rounded-pill bg-white/[0.06] px-[7px] text-[11px] font-semibold text-fg-6">
                  {g.items.length}
                </span>
              </div>
              {g.items.map((row) => (
                <AccessRowItem
                  key={row.id}
                  row={row}
                  showAmbiente
                  onOpen={() => setOpenId(row.id)}
                />
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <div className="px-4 py-8 text-center text-[12.5px] text-fg-8">
              Nenhum acesso encontrado.
            </div>
          )}
        </div>
      </div>

      {openRow && (
        <AccessDetail
          key={openRow.id}
          row={openRow}
          isAdmin={isAdmin}
          onEdit={() => setModal("edit")}
          onClose={() => setOpenId(null)}
        />
      )}
      {modal === "new" && (
        <AccessModal products={products} onClose={() => setModal(null)} />
      )}
      {modal === "edit" && openRow && (
        <AccessModal
          products={products}
          row={openRow}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-[6px] px-3 text-[13px] font-medium transition-colors duration-200 md:h-[30px] md:text-[12.5px]",
        active ? "bg-white/[0.09] text-fg-2" : "text-fg-6 hover:text-fg-3",
      )}
    >
      {children}
    </button>
  );
}
