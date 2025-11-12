/**
 * Safe fetch wrapper that handles ERR_EMPTY_RESPONSE gracefully
 * Retries failed requests and handles navigation cancellation
 */

interface SafeFetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Fetch with retry logic and empty response handling
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const {
    retries = 1, // Reduced retries to fail faster
    retryDelay = 300,
    timeout = 10000, // Reduced to 10s to fail fast
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check if response is actually empty (ERR_EMPTY_RESPONSE)
        if (!response.ok && response.status === 0) {
          throw new Error('Empty response received');
        }

        return response;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Don't retry on abort (user navigation or timeout)
        if (fetchError.name === 'AbortError') {
          throw fetchError;
        }

        // Don't retry on 4xx errors (client errors)
        if (fetchError instanceof Response && fetchError.status >= 400 && fetchError.status < 500) {
          throw fetchError;
        }

        lastError = fetchError;
      }
    } catch (error: any) {
      lastError = error;

      // If this is the last attempt, throw
      if (attempt === retries) {
        break;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('Request failed after retries');
}

/**
 * Fetch JSON with automatic parsing and error handling
 */
export async function safeFetchJson<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<T> {
  const response = await safeFetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('Failed to parse JSON response');
  }
}

