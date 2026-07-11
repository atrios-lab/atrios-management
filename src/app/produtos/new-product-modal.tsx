"use client";

import { useState, useTransition } from "react";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { Button, IconButton, Input, Sheet } from "@/components/ui";
import { slugify, suggestCode } from "@/lib/product-constants";
import { createProduct } from "./actions";

interface RepoRow {
  label: string;
  name: string;
}

const DEFAULT_REPOS = (slug: string): RepoRow[] => [
  { label: "frontend", name: `${slug}-web` },
  { label: "api", name: `${slug}-api` },
  { label: "mobile", name: `${slug}-mobile` },
];

export function NewProductModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [codeDirty, setCodeDirty] = useState(false);
  const [repos, setRepos] = useState<RepoRow[]>(DEFAULT_REPOS(""));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setDescription("");
    setCode("");
    setCodeDirty(false);
    setRepos(DEFAULT_REPOS(""));
    setError(null);
  };

  const onNameChange = (v: string) => {
    setName(v);
    if (!codeDirty) setCode(suggestCode(v));
    setRepos(DEFAULT_REPOS(slugify(v)).slice(0, repos.length || 1));
  };

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await createProduct({ name, description, code, repos });
      if (result.error) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
    });
  };

  return (
    <>
      <Button icon={<PlusIcon />} onClick={() => setOpen(true)}>
        <span className="hidden md:inline">Novo produto</span>
      </Button>
      {open && (
        <Sheet
          mode="fullscreen"
          title="Novo produto"
          onClose={() => setOpen(false)}
          action={{
            label: pending ? "Criando…" : "Criar produto",
            onClick: submit,
            disabled: pending,
          }}
          panelClassName="md:w-[520px]"
        >
          <div className="flex flex-col gap-4 p-4 md:p-[18px]">
            <div className="flex flex-col gap-[7px]">
              <label
                htmlFor="np-name"
                className="text-xs font-medium text-fg-5"
              >
                Nome do produto
              </label>
              <Input
                id="np-name"
                size="lg"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-[7px]">
              <label
                htmlFor="np-description"
                className="text-xs font-medium text-fg-5"
              >
                Descrição
              </label>
              <textarea
                id="np-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="O que é este produto?"
                className="w-full resize-none rounded-field border border-line-field bg-surface-1 px-3 py-2 text-sm leading-[1.5] text-fg-2 outline-none transition-colors duration-200 placeholder:text-fg-8 focus:border-primary/40"
              />
            </div>
            <div className="flex flex-col gap-[7px]">
              <label
                htmlFor="np-code"
                className="text-xs font-medium text-fg-5"
              >
                Código
              </label>
              <div className="flex items-center gap-2.5">
                <div className="w-24 shrink-0">
                  <Input
                    id="np-code"
                    size="lg"
                    mono
                    focused
                    value={code}
                    onChange={(e) => {
                      setCodeDirty(true);
                      setCode(e.target.value.toUpperCase().slice(0, 4));
                    }}
                  />
                </div>
                <span className="text-xs leading-[1.4] text-fg-8">
                  Sugerido a partir do nome · usado nos ids{" "}
                  <span className="font-mono text-fg-6">
                    {code || "ABC"}-12
                  </span>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-[9px]">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-fg-5">
                  Repositórios
                </span>
                <span className="text-[11px] text-fg-9">
                  apenas registro — link para o GitHub
                </span>
              </div>
              {repos.map((r, i) => (
                <div
                  key={`${i}-${r.label}`}
                  className="flex items-center gap-2"
                >
                  <div className="w-[120px] shrink-0">
                    <Input
                      aria-label="Papel do repositório"
                      size="sm"
                      className="rounded-btn text-[13px]"
                      value={r.label}
                      onChange={(e) =>
                        setRepos(
                          repos.map((x, j) =>
                            j === i ? { ...x, label: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex h-9 flex-1 items-center rounded-btn border border-line-field bg-surface-1 px-[11px] font-mono text-[13px] text-fg-2">
                    <span className="text-fg-8">atrios/</span>
                    <input
                      aria-label="Nome do repositório"
                      className="w-full bg-transparent outline-none"
                      value={r.name}
                      onChange={(e) =>
                        setRepos(
                          repos.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <IconButton
                    aria-label="Remover repositório"
                    size={22}
                    className="hover:text-danger"
                    onClick={() => setRepos(repos.filter((_, j) => j !== i))}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>
              ))}
              <Button
                variant="dashed"
                size="md"
                icon={<PlusIcon size={12} />}
                className="self-start"
                onClick={() =>
                  setRepos([...repos, { label: "", name: `${slugify(name)}-` }])
                }
              >
                Adicionar repositório
              </Button>
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
