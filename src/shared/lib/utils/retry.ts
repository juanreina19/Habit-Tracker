/**
 * Reintenta una vez, en silencio, ante un fallo transitorio (blip de red,
 * timeout de Supabase). Si el segundo intento también falla, propaga el
 * error tal cual — el caller decide cómo mostrarlo.
 */
export async function withSilentRetry<T>(fn: () => Promise<T>, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return await fn();
  }
}
