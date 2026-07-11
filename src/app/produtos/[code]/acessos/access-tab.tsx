"use client";

import { useMemo, useState } from "react";
import { KeyIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { ACCESS_AMBIENTES, AMBIENTE_ORDER } from "@/lib/vault-constants";
import {
  AccessDetail,
  AccessModal,
  type AccessRow,
  AccessRowItem,
  type VaultProductOption,
} from "../../../cofre/vault-ui";

export function AccessTab({
  productId,
  accesses,
  products,
  isAdmin,
}: {
  productId: string;
  accesses: AccessRow[];
  products: VaultProductOption[];
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | "edit" | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accesses;
    return accesses.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.login.toLowerCase().includes(q),
    );
  }, [accesses, query]);

  const groups = AMBIENTE_ORDER.map((amb) => ({
    amb,
    items: filtered.filter((a) => a.ambiente === amb),
  })).filter((g) => g.items.length > 0);

  const openRow = openId ? accesses.find((a) => a.id === openId) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-4 pb-4 pt-4 md:px-[22px] md:pb-[22px]">
      {accesses.length === 0 ? (
        <EmptyState onNew={() => setModal("new")} />
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-field border border-[rgba(255,255,255,0.09)] bg-surface-1 px-[11px] md:h-8 md:flex-none md:basis-[260px]">
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
            <div className="ml-auto" />
            <Button icon={<PlusIcon />} onClick={() => setModal("new")}>
              <span className="hidden md:inline">Novo acesso</span>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-surface-1">
            {groups.map((g) => (
              <div key={g.amb}>
                <div className="flex items-center gap-[9px] border-b border-line-subtle bg-surface-4 px-4 py-[9px]">
                  <span
                    className="size-[9px] shrink-0 rounded-full"
                    style={{ background: ACCESS_AMBIENTES[g.amb].color }}
                  />
                  <span className="text-[12.5px] font-semibold text-fg-3">
                    {ACCESS_AMBIENTES[g.amb].label}
                  </span>
                  <span className="rounded-pill bg-white/[0.06] px-[7px] text-[11px] font-semibold text-fg-6">
                    {g.items.length}
                  </span>
                </div>
                {g.items.map((row) => (
                  <AccessRowItem
                    key={row.id}
                    row={row}
                    showAvatar
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
        </>
      )}

      {openRow && (
        <AccessDetail
          key={openRow.id}
          row={openRow}
          isAdmin={isAdmin}
          onEdit={() => {
            setModal("edit");
          }}
          onClose={() => setOpenId(null)}
        />
      )}
      {modal === "new" && (
        <AccessModal
          products={products}
          defaultProductId={productId}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "edit" && openRow && (
        <AccessModal
          products={products}
          row={openRow}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-[18px] flex size-[46px] items-center justify-center rounded-[12px] border border-primary/25 bg-primary/10 text-[#8b93ec]">
        <KeyIcon size={20} />
      </div>
      <span className="mb-[7px] text-[15.5px] font-semibold tracking-[-0.01em] text-fg-1">
        Nenhum acesso guardado
      </span>
      <p className="mb-5 max-w-[340px] text-[13px] leading-[1.55] text-fg-7">
        Guarde credenciais de admin, contas de plataformas e bancos usadas pelo
        produto — o time encontra tudo em um lugar só.
      </p>
      <Button icon={<PlusIcon />} onClick={onNew}>
        Novo acesso
      </Button>
      <span className="mt-4 text-[11.5px] text-fg-9">
        Senhas são criptografadas · visíveis apenas para admins.
      </span>
    </div>
  );
}
