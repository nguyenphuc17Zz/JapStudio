"use client";

import { useEffect, useState } from "react";
import { Agentation } from "agentation";

export function AgentationDev() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    try {
      if (
        process.env.NEXT_PUBLIC_ENABLE_AGENTATION === "true" ||
        localStorage.getItem("enable_agentation") === "true"
      ) {
        setIsEnabled(true);
      }
    } catch {}
  }, []);

  if (!isEnabled) {
    return null;
  }

  return <Agentation endpoint="http://localhost:4747" />;
}
