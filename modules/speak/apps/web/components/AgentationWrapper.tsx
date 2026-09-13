"use client";

import { useEffect, useState } from "react";
import { Agentation } from "agentation";

export function AgentationDev() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (process.env.NODE_ENV !== "development" || !mounted) {
    return null;
  }

  return <Agentation />;
}
