import { useEffect, useState } from "react";
import { PAY_LINK_SLOW_MS } from "@/lib/pay-links";

// Vrai quand l'attente identifiée par `waitKey` dure plus de `delayMs`.
// `waitKey` vaut null quand rien n'est en attente ; une nouvelle clé (nouvel
// essai) repart de zéro sans remettre d'état à jour dans l'effet.
export function useSlowFlag(waitKey: number | null, delayMs: number = PAY_LINK_SLOW_MS): boolean {
  const [slowKey, setSlowKey] = useState<number | null>(null);

  useEffect(() => {
    if (waitKey === null) return;
    const timer = setTimeout(() => setSlowKey(waitKey), delayMs);
    return () => clearTimeout(timer);
  }, [waitKey, delayMs]);

  return waitKey !== null && slowKey === waitKey;
}
