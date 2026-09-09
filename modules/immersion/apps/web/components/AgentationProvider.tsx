"use client";

import { Agentation } from "agentation";
import { useEffect, useState } from "react";

export function AgentationProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || process.env.NODE_ENV !== "development") {
    return null;
  }

  return <Agentation />;
}
