"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Radial pause-window countdown driven by requestAnimationFrame (no setInterval drift). */
export function useAizuchiWindow() {
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [expired, setExpired] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const rafRef = useRef<number | null>(null);
  const deadlineRef = useRef<number>(0);
  const pausedLeftRef = useRef<number>(0);
  const onExpireRef = useRef<(() => void) | null>(null);

  const clear = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const tick = useCallback(() => {
    const left = deadlineRef.current - performance.now();
    if (left <= 0) {
      setRemainingMs(0);
      setExpired(true);
      rafRef.current = null;
      onExpireRef.current?.();
      return;
    }
    setRemainingMs(left);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(
    (windowMs: number, onExpire?: () => void) => {
      clear();
      setExpired(false);
      setIsPaused(false);
      pausedLeftRef.current = 0;
      if (!windowMs || windowMs <= 0) {
        setRemainingMs(0);
        setTotalMs(0);
        return;
      }
      setTotalMs(windowMs);
      setRemainingMs(windowMs);
      onExpireRef.current = onExpire || null;
      deadlineRef.current = performance.now() + windowMs;
      rafRef.current = requestAnimationFrame(tick);
    },
    [clear, tick]
  );

  const stop = useCallback(() => {
    clear();
    onExpireRef.current = null;
    setIsPaused(false);
    pausedLeftRef.current = 0;
  }, [clear]);

  const pause = useCallback(() => {
    if (rafRef.current === null) return;
    clear();
    pausedLeftRef.current = Math.max(0, deadlineRef.current - performance.now());
    setRemainingMs(pausedLeftRef.current);
    setIsPaused(true);
  }, [clear]);

  const resume = useCallback(() => {
    if (!isPaused) return;
    setIsPaused(false);
    deadlineRef.current = performance.now() + pausedLeftRef.current;
    pausedLeftRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }, [isPaused, tick]);

  const togglePause = useCallback(() => {
    if (isPaused) resume();
    else pause();
  }, [isPaused, pause, resume]);

  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 1;
  const state: "idle" | "normal" | "warning" | "critical" =
    totalMs === 0 ? "idle" : ratio > 0.5 ? "normal" : ratio > 0.25 ? "warning" : "critical";

  return { remainingMs, totalMs, ratio, state, expired, isPaused, start, stop, pause, resume, togglePause };
}
