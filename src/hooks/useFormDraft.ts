import { useEffect, useRef, useState, useCallback } from "react";

const PREFIX = "draft:";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const MAX_BYTES = 100_000;

interface StoredDraft<T> {
  value: T;
  savedAt: number;
}

interface Options<T> {
  key: string | null | undefined;
  value: T;
  setValue: (v: T) => void;
  enabled?: boolean;
  debounceMs?: number;
  /** Quando true, NÃO restaura automaticamente — apenas indica que existe rascunho via `restored` para o consumidor decidir. Default false (restaura). */
  manualRestore?: boolean;
}

export interface UseFormDraftReturn {
  /** Indica que um rascunho foi restaurado nesta montagem. */
  restored: boolean;
  /** Timestamp do último save no localStorage. */
  lastSavedAt: Date | null;
  /** Apaga o rascunho do storage e zera o estado de restauração. */
  clearDraft: () => void;
  /** Apaga o rascunho do storage E reseta o form para o valor inicial fornecido. */
  discardDraft: (resetTo?: any) => void;
}

/**
 * Salva automaticamente o estado de um formulário em localStorage com debounce,
 * e restaura na próxima montagem. Use `clearDraft()` após salvar com sucesso no servidor.
 */
export function useFormDraft<T>({
  key,
  value,
  setValue,
  enabled = true,
  debounceMs = 600,
  manualRestore = false,
}: Options<T>): UseFormDraftReturn {
  const fullKey = key ? `${PREFIX}${key}` : null;
  const [restored, setRestored] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreCheckedRef = useRef<string | null>(null);

  // Restauração + limpeza de TTL — roda quando a chave muda
  useEffect(() => {
    if (!fullKey || !enabled) return;
    if (restoreCheckedRef.current === fullKey) return;
    restoreCheckedRef.current = fullKey;

    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredDraft<T>;
      if (!parsed?.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
        localStorage.removeItem(fullKey);
        return;
      }
      if (!manualRestore) {
        setValue(parsed.value);
      }
      setRestored(true);
      setLastSavedAt(new Date(parsed.savedAt));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey, enabled]);

  // Persistência debounced
  useEffect(() => {
    if (!fullKey || !enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const payload: StoredDraft<T> = { value, savedAt: Date.now() };
        const serialized = JSON.stringify(payload);
        if (serialized.length > MAX_BYTES) return; // evita estourar storage
        localStorage.setItem(fullKey, serialized);
        setLastSavedAt(new Date(payload.savedAt));
      } catch {
        // quota cheia ou serialização falhou — silencioso
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fullKey, value, enabled, debounceMs]);

  const clearDraft = useCallback(() => {
    if (!fullKey) return;
    try {
      localStorage.removeItem(fullKey);
    } catch {}
    setRestored(false);
    setLastSavedAt(null);
  }, [fullKey]);

  const discardDraft = useCallback(
    (resetTo?: any) => {
      clearDraft();
      if (resetTo !== undefined) setValue(resetTo);
    },
    [clearDraft, setValue],
  );

  return { restored, lastSavedAt, clearDraft, discardDraft };
}
