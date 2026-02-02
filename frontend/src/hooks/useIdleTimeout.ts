import { useEffect, useRef } from 'react';

interface UseIdleTimeoutOptions {
  timeout: number; // timeout in milliseconds
  onIdle: () => void; // callback when idle timeout is reached
}

// All activity events that should reset the idle timer
const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'keyup',
  'touchstart',
  'touchmove',
  'click',
  'scroll',
  'wheel',
] as const;

/**
 * Hook to detect user inactivity and automatically trigger logout after timeout.
 * 
 * Behavior:
 * 1. Timer starts on mount
 * 2. Any user activity (mouse, keyboard, touch, scroll) resets the timer
 * 3. After timeout period of inactivity, onIdle callback is triggered immediately
 * 4. Timer pauses when tab is hidden and resumes when visible
 */
export function useIdleTimeout({ timeout, onIdle }: UseIdleTimeoutOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  const mountedRef = useRef(true);
  const lastActivityRef = useRef(0);

  // Keep onIdle ref updated to avoid stale closures
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    mountedRef.current = true;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const startTimer = () => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        // Only trigger if still mounted and enough time has actually passed
        if (mountedRef.current) {
          const elapsed = Date.now() - lastActivityRef.current;
          if (elapsed >= timeout - 100) { // 100ms tolerance
            onIdleRef.current();
          } else {
            // Not enough time passed, restart timer for remaining time
            startTimer();
          }
        }
      }, timeout);
    };

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      startTimer();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - clear timer to prevent it firing while hidden
        clearTimer();
      } else {
        // Tab visible - check if we should have timed out while hidden
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeout) {
          if (mountedRef.current) {
            onIdleRef.current();
          }
        } else {
          // Resume timer for remaining time
          startTimer();
        }
      }
    };

    // Add event listeners for all activity events
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Handle tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start initial timer
    resetTimer();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      clearTimer();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timeout]);
}
