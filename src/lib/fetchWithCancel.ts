/**
 * Enhanced fetch utility with request cancellation and deduplication
 * Prevents ERR_EMPTY_RESPONSE when navigating quickly between pages
 */

import React from 'react';

// Request cache for deduplication
const requestCache = new Map<string, Promise<Response>>();
const abortControllers = new Map<string, AbortController>();

interface FetchOptions extends RequestInit {
  timeout?: number;
  dedupe?: boolean;
  cacheKey?: string;
}

/**
 * Fetch with automatic cancellation, timeout, and deduplication
 */
export async function fetchWithCancel(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 30000, // 30 second default timeout
    dedupe = true,
    cacheKey,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  // Create cache key for deduplication
  const key = cacheKey || `${url}-${JSON.stringify(fetchOptions)}`;

  // Check for duplicate in-flight requests
  if (dedupe && requestCache.has(key)) {
    return requestCache.get(key)!;
  }

  // Create abort controller for this request
  const abortController = new AbortController();
  const abortSignal = externalSignal
    ? (() => {
        const combinedController = new AbortController();
        externalSignal.addEventListener('abort', () => {
          combinedController.abort();
          abortController.abort();
        });
        return combinedController.signal;
      })()
    : abortController.signal;

  // Store abort controller
  abortControllers.set(key, abortController);

  // Create timeout
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  // Create fetch promise
  const fetchPromise = fetch(url, {
    ...fetchOptions,
    signal: abortSignal,
  })
    .then((response) => {
      clearTimeout(timeoutId);
      requestCache.delete(key);
      abortControllers.delete(key);
      return response;
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      requestCache.delete(key);
      abortControllers.delete(key);
      
      // Don't throw for aborted requests (user navigation)
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    });

  // Store in cache for deduplication
  if (dedupe) {
    requestCache.set(key, fetchPromise);
  }

  return fetchPromise;
}

/**
 * Cancel a specific request by cache key
 */
export function cancelRequest(key: string): void {
  const controller = abortControllers.get(key);
  if (controller) {
    controller.abort();
    requestCache.delete(key);
    abortControllers.delete(key);
  }
}

/**
 * Cancel all in-flight requests
 */
export function cancelAllRequests(): void {
  abortControllers.forEach((controller) => {
    controller.abort();
  });
  requestCache.clear();
  abortControllers.clear();
}

/**
 * React hook for fetch with automatic cleanup
 */
export function useFetchWithCancel() {
  const controllersRef = React.useRef<Map<string, AbortController>>(new Map());

  React.useEffect(() => {
    return () => {
      // Cancel all requests on unmount
      controllersRef.current.forEach((controller) => {
        controller.abort();
      });
      controllersRef.current.clear();
    };
  }, []);

  const fetchWithCleanup = React.useCallback(
    async (url: string, options: FetchOptions = {}) => {
      const key = options.cacheKey || url;
      
      // Cancel previous request with same key
      const existingController = controllersRef.current.get(key);
      if (existingController) {
        existingController.abort();
      }

      // Create new controller
      const controller = new AbortController();
      controllersRef.current.set(key, controller);

      try {
        return await fetchWithCancel(url, {
          ...options,
          signal: controller.signal,
        });
      } finally {
        controllersRef.current.delete(key);
      }
    },
    []
  );

  return fetchWithCleanup;
}

