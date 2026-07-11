"use client";

import { useEffect, useState } from "react";

/**
 * True abaixo de 768px (breakpoint mobile da spec). Começa em `false` no
 * primeiro render (SSR) — use apenas para interações pós-clique, não para
 * decidir layout inicial (isso é papel das classes responsivas).
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return mobile;
}
