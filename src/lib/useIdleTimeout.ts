import { useEffect, useRef, useCallback } from 'react';

// Batas waktu idle: tepat 1 menit (60.000 milidetik) tanpa tindakan
export const IDLE_TIMEOUT_MS = 60 * 1000;
const LAST_ACTIVE_KEY = 'ciputra_intra_last_active_v1';

export function recordUserActivity(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    } catch (e) {
      console.warn('Failed to record activity:', e);
    }
  }
}

export function isSessionExpiredByInactivity(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!raw) return false;
    const lastTime = Number(raw);
    if (isNaN(lastTime) || lastTime <= 0) return false;
    return Date.now() - lastTime > IDLE_TIMEOUT_MS;
  } catch (e) {
    return false;
  }
}

export function clearActivityTimer(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LAST_ACTIVE_KEY);
    } catch (e) {}
  }
}

/**
 * Hook to automatically log out user after 1 minute of inactivity (no mouse/keyboard/touch/scroll).
 * Crucially, refreshing the browser does NOT log the user out as long as last activity was within 1 minute.
 */
export function useIdleTimeout(
  isLoggedIn: boolean,
  onTimeout: () => void
): { resetTimer: () => void } {
  const lastActivityRef = useRef<number>(Date.now());
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const resetTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    recordUserActivity();
  }, []);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Throttle localStorage updates to avoid thrashing
    if (now - lastActivityRef.current > 2000) {
      recordUserActivity();
    }
    lastActivityRef.current = now;
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    // Check if user was already inactive for > 1 min prior to reload
    if (isSessionExpiredByInactivity()) {
      onTimeoutRef.current();
      return;
    }

    // User is active on page reload; keep them logged in!
    recordUserActivity();
    lastActivityRef.current = Date.now();

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleActivity, { passive: true });
    });

    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        onTimeoutRef.current();
      }
    }, 2000);

    return () => {
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleActivity);
      });
      clearInterval(intervalId);
    };
  }, [isLoggedIn, handleActivity]);

  return { resetTimer };
}
