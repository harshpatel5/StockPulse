// Module-level request deduplication to prevent duplicate API calls
// Works even with React StrictMode double-rendering

const pendingRequests = new Map();
const requestTimestamps = new Map();

/**
 * Deduplicate API calls - if the same request is made within a short time window,
 * return the existing promise instead of making a new request
 * 
 * @param {string} key - Unique key for the request (e.g., 'getMe', 'fetchAssets:token123')
 * @param {Function} requestFn - Function that returns a promise for the API call
 * @param {number} dedupeWindow - Time window in ms to dedupe requests (default: 1000ms)
 * @returns {Promise} The promise for the request
 */
export const dedupeRequest = async (key, requestFn, dedupeWindow = 1000) => {
  const now = Date.now();
  const lastRequestTime = requestTimestamps.get(key) || 0;
  
  // If there's a pending request, return it
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  // If the same request was made recently, return a resolved promise with cached result
  // (This prevents rapid re-renders from causing duplicate calls)
  if (now - lastRequestTime < dedupeWindow) {
    // Return the last result if available, otherwise wait for pending
    const pending = pendingRequests.get(key);
    if (pending) {
      return pending;
    }
  }
  
  // Create new request
  const requestPromise = requestFn()
    .then((result) => {
      pendingRequests.delete(key);
      requestTimestamps.set(key, Date.now());
      return result;
    })
    .catch((error) => {
      pendingRequests.delete(key);
      throw error;
    });
  
  pendingRequests.set(key, requestPromise);
  return requestPromise;
};

/**
 * Clear deduplication cache for a specific key
 */
export const clearDedupeCache = (key) => {
  pendingRequests.delete(key);
  requestTimestamps.delete(key);
};

/**
 * Clear all deduplication caches
 */
export const clearAllDedupeCache = () => {
  pendingRequests.clear();
  requestTimestamps.clear();
};

