export class FetchTimeoutError extends Error {
  name = "FetchTimeoutError";
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30_000, ...rest } = init;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...rest, signal: controller.signal });
    return res;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new FetchTimeoutError("Request timed out. Please try again.");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export function friendlyNetworkMessage(err: unknown): string {
  if (err instanceof FetchTimeoutError) return err.message;
  if (err instanceof TypeError) {
    // Most common fetch network failure in browsers.
    return "Network error. Check your connection and try again.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

