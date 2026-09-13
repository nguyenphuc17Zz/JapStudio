"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface PersistOptions<T> {
  serialize?: (val: T) => string;
  deserialize?: (raw: string) => T;
}

/**
 * usePersistedState
 * Hook an toàn cho Next.js App Router để lưu trữ và nạp state từ localStorage:
 * - Chống Hydration Mismatch bằng cách khởi tạo mặc định trên SSR và nạp trên client mount.
 * - Chống Overwrite Race Condition: Chỉ ghi vào localStorage sau khi đã hydrate thành công dữ liệu cũ.
 * - Đồng bộ tức thì: Khi gọi setter, dữ liệu được ghi vào localStorage ngay lập tức.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options?: PersistOptions<T>
): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const isHydratedRef = useRef(false);

  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? JSON.parse;

  // 1. Hydrate from localStorage once on client mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const item = localStorage.getItem(key);
        if (item !== null && item !== undefined) {
          setState(deserialize(item));
        }
      }
    } catch (error) {
      console.warn(`[usePersistedState] Failed to read key "${key}":`, error);
    } finally {
      isHydratedRef.current = true;
      setIsHydrated(true);
    }
  }, [key]);

  // 2. Setter that updates React state and persists to localStorage synchronously
  const setPersistedState = useCallback(
    (valueOrFn: T | ((prev: T) => T)) => {
      setState((prev) => {
        const nextValue =
          typeof valueOrFn === "function"
            ? (valueOrFn as (p: T) => T)(prev)
            : valueOrFn;

        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(key, serialize(nextValue));
          }
        } catch (error) {
          console.warn(`[usePersistedState] Failed to write key "${key}":`, error);
        }

        return nextValue;
      });
    },
    [key, serialize]
  );

  return [state, setPersistedState, isHydrated];
}
