import { useCallback, useRef, useEffect } from "react";
import { DictionaryMatch } from "@/lib/medical-dictionary";

/**
 * High-performance hook that offloads medical dictionary matching to a background thread.
 * This prevents the UI from locking up during OCR analysis.
 */
export const useMedicalWorker = () => {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Vite handles this syntax automatically to bundle the worker separately
    workerRef.current = new Worker(new URL("../utils/medical-worker.ts", import.meta.url), {
      type: "module",
    });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const matchAsync = useCallback((raw: string, threshold = 0.55): Promise<DictionaryMatch | null> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        resolve(null);
        return;
      }

      const handler = (e: MessageEvent) => {
        workerRef.current?.removeEventListener("message", handler);
        resolve(e.data);
      };

      workerRef.current.addEventListener("message", handler);
      workerRef.current.postMessage({ raw, threshold });
    });
  }, []);

  return { matchAsync };
};
