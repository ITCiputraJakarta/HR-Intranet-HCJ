import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionConfig } from 'motion/react';

gsap.registerPlugin(ScrollTrigger);

interface LenisContextValue {
  lenis: Lenis | null;
  scrollToTop: (immediate?: boolean) => void;
  refreshScrollTrigger: () => void;
}

const LenisContext = createContext<LenisContextValue>({
  lenis: null,
  scrollToTop: () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  },
  refreshScrollTrigger: () => {
    ScrollTrigger.refresh();
  },
});

export const useLenis = () => useContext(LenisContext);

function shouldPreventLenis(node: HTMLElement | Element | null): boolean {
  if (!node || !(node instanceof Element)) return false;

  if (
    node.closest(
      '[data-lenis-prevent], .sidebar-scroll, [role="dialog"], [aria-modal="true"]'
    )
  ) {
    return true;
  }

  let current: Element | null = node;
  while (current && current !== document.body && current !== document.documentElement) {
    if (
      current.classList.contains('overflow-y-auto') ||
      current.classList.contains('overflow-auto')
    ) {
      if (current.scrollHeight > current.clientHeight + 1) {
        return true;
      }
    }

    if (current.tagName === 'TEXTAREA' || current.tagName === 'SELECT') {
      if (current.scrollHeight > current.clientHeight + 1) {
        return true;
      }
    }

    current = current.parentElement;
  }

  return false;
}

export const MotionLenisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
      prevent: (node) => shouldPreventLenis(node),
    });

    lenisRef.current = lenis;
    setLenisInstance(lenis);

    const onLenisScroll = () => {
      ScrollTrigger.update();
    };
    lenis.on('scroll', onLenisScroll);

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    const handleBeforePrint = () => {
      lenis.stop();
    };
    const handleAfterPrint = () => {
      lenis.start();
      ScrollTrigger.refresh();
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      gsap.ticker.remove(updateLenis);
      lenis.off('scroll', onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
      setLenisInstance(null);
    };
  }, []);

  const scrollToTop = useCallback((immediate: boolean = false) => {
    const behavior: ScrollBehavior = immediate ? 'auto' : 'smooth';

    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, immediate ? { immediate: true } : { duration: 0.85 });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior });
      document.body.scrollTo({ top: 0, left: 0, behavior });
    }

    const scrollables = document.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
    scrollables.forEach((el) => {
      if (el.scrollTop > 0) {
        el.scrollTo({ top: 0, left: 0, behavior });
      }
    });
  }, []);

  const refreshScrollTrigger = useCallback(() => {
    ScrollTrigger.refresh();
  }, []);

  return (
    <LenisContext.Provider
      value={{
        lenis: lenisInstance,
        scrollToTop,
        refreshScrollTrigger,
      }}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LenisContext.Provider>
  );
};
