'use client';
import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * useOptimistic
 * Instantly applies a state mutation, fires the async operation,
 * and rolls back cleanly on failure.
 *
 * Usage:
 *   const [items, runOptimistic, isRunning] = useOptimistic(initialItems);
 */
export function useOptimistic(initialData) {
  const [data, setData] = useState(initialData);
  const [isRunning, setIsRunning] = useState(false);
  const snapshotRef = useRef(null);

  // Keep data in sync if initialData changes from outside
  const syncedData = data;

  const runOptimistic = useCallback(
    async ({ update, request, onSuccess, onError, successMsg, errorMsg }) => {
      // 1. Snapshot current state for rollback
      snapshotRef.current = syncedData;

      // 2. Optimistically apply the update
      setData((prev) => update(prev));
      setIsRunning(true);

      try {
        // 3. Fire the real request
        const result = await request();

        // 4. Optionally reconcile with server response
        if (onSuccess) {
          setData((prev) => onSuccess(result, prev));
        }

        if (successMsg) toast.success(successMsg);
        return result;
      } catch (err) {
        // 5. Roll back to snapshot
        setData(snapshotRef.current);
        const message = err?.response?.data?.error || errorMsg || 'Something went wrong';
        toast.error(message);
        onError?.(err);
        throw err;
      } finally {
        setIsRunning(false);
        snapshotRef.current = null;
      }
    },
    [syncedData]
  );

  // Allow external updates (e.g. from sockets)
  const setOptimisticData = useCallback((updater) => {
    setData(typeof updater === 'function' ? updater : () => updater);
  }, []);

  return [syncedData, runOptimistic, isRunning, setOptimisticData];
}

/**
 * useOptimisticToggle
 * Convenience wrapper for boolean flag toggling (pin, like, done, etc.)
 */
export function useOptimisticToggle(initialValue, onToggle) {
  const [value, , isRunning, setOptimistic] = useOptimistic(initialValue);

  const toggle = useCallback(async () => {
    const next = !value;

    try {
      // Apply optimistic update immediately[cite: 7]
      setOptimistic(next);
      // Trigger the external toggle logic[cite: 7]
      await onToggle(next);
    } catch (err) {
      // Roll back on failure[cite: 7]
      setOptimistic(!next);
    }
  }, [value, onToggle, setOptimistic]); // Added setOptimistic to satisfy ESLint[cite: 7]

  return [value, toggle, isRunning];
}