"use client";

import { useState, useTransition } from "react";
import { IconButton, Input, Sheet } from "@/components/ui";
import { updateProduct } from "../actions";

interface EditProductModalProps {
  productId: string;
  name: string;
  description: string;
  longDescription: string | null;
}

export function EditProductModal({
  productId,
  name: initialName,
  description: initialDescription,
  longDescription: initialLongDescription,
}: EditProductModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [longDescription, setLongDescription] = useState(
    initialLongDescription ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setName(initialName);
    setDescription(initialDescription);
    setLongDescription(initialLongDescription ?? "");
    setError(null);
  };

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await updateProduct(productId, {
        name,
        description,
        longDescription: longDescription || undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  };

  return (
    <>
      <IconButton
        aria-label="Editar produto"
        size={20}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M12.146.854a1.5 1.5 0 0 1 2.12 0l1.08 1.08a1.5 1.5 0 0 1 0 2.12L3.12 15H0v-3.12L12.146.854zm1.414 1.414l-9.9 9.9.707.707 9.9-9.9-.707-.707zM0 15h2v2H0v-2z" />
        </svg>
      </IconButton>
      {open && (
        <Sheet
          mode="fullscreen"
          title="Editar produto"
          onClose={() => setOpen(false)}
          action={{
            label: pending ? "Salvando…" : "Salvar",
            onClick: submit,
            disabled: pending,
          }}
          panelClassName="md:w-[520px]"
        >
          <div className="flex flex-col gap-4 p-4 md:p-[18px]">
            <div className="flex flex-col gap-[7px]">
              <label
                htmlFor="ep-name"
                className="text-xs font-medium text-fg-5"
              >
                Nome do produto
              </label>
              <Input
                id="ep-name"
                size="lg"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-[7px]">
              <label
                htmlFor="ep-description"
                className="text-xs font-medium text-fg-5"
              >
                Descrição
              </label>
              <textarea
                id="ep-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="O que é este produto?"
                className="w-full resize-none rounded-field border border-line-field bg-surface-1 px-3 py-2 text-sm leading-[1.5] text-fg-2 outline-none transition-colors duration-200 placeholder:text-fg-8 focus:border-primary/40"
              />
            </div>
            <div className="flex flex-col gap-[7px]">
              <label
                htmlFor="ep-long-description"
                className="text-xs font-medium text-fg-5"
              >
                Descrição detalhada{" "}
                <span className="text-fg-9">(opcional)</span>
              </label>
              <textarea
                id="ep-long-description"
                rows={4}
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                placeholder="Detalhes adicionais sobre o produto"
                className="w-full resize-none rounded-field border border-line-field bg-surface-1 px-3 py-2 text-sm leading-[1.5] text-fg-2 outline-none transition-colors duration-200 placeholder:text-fg-8 focus:border-primary/40"
              />
            </div>
            {error && (
              <p className="text-xs leading-[1.4] text-danger">{error}</p>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
