"use client";

import { useEffect, useRef, useState } from "react";
import { KbApiError } from "./apiClient";
import type { KbApiMode } from "@/types/kb";

export type LoadState<T> =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ok"; data: T; mode: KbApiMode; warnings: string[] };

/**
 * 通用知识中枢数据 hook。
 * fetcher 返回信封 { data, mode, warnings }。
 * deps 变化时自动重新拉取。
 */
export function useKb<T>(
  fetcher: () => Promise<{ data: T; mode?: KbApiMode; warnings?: string[] }>,
  deps: ReadonlyArray<unknown> = [],
): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ state: "loading" });
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    fetcher()
      .then((res) => {
        if (!activeRef.current) return;
        setState({
          state: "ok",
          data: res.data,
          mode: res.mode ?? "online",
          warnings: res.warnings ?? [],
        });
      })
      .catch((err) => {
        if (!activeRef.current) return;
        setState({
          state: "error",
          message: err instanceof KbApiError ? err.message : err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      activeRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
