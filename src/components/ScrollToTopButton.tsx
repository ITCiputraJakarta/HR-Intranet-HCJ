import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLenis } from './common/MotionLenisProvider';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { lenis, scrollToTop } = useLenis();

  useEffect(() => {
    const checkScrollPosition = () => {
      const windowScroll =
        lenis?.scroll ??
        (window.pageYOffset ||
          window.scrollY ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0);

      let containerScroll = 0;
      const scrollables = document.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
      scrollables.forEach((el) => {
        if (el.scrollTop > containerScroll) {
          containerScroll = el.scrollTop;
        }
      });

      const maxScroll = Math.max(windowScroll, containerScroll);
      setIsVisible(maxScroll > 150);
    };

    window.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition, { passive: true });
    window.addEventListener('touchmove', checkScrollPosition, { passive: true });
    document.addEventListener('scroll', checkScrollPosition, { passive: true, capture: true });
    lenis?.on('scroll', checkScrollPosition);

    checkScrollPosition();

    return () => {
      window.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
      window.removeEventListener('touchmove', checkScrollPosition);
      document.removeEventListener('scroll', checkScrollPosition, true);
      lenis?.off('scroll', checkScrollPosition);
    };
  }, [lenis]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.78 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.78 }}
          transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          className="fixed bottom-5 sm:bottom-7 right-5 sm:right-7 z-[45]"
        >
          <motion.button
            type="button"
            id="btn-scroll-to-top"
            onClick={() => scrollToTop(false)}
            whileHover={{ scale: 1.07, y: -2 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Gulir ke paling atas"
            title="Gulir ke paling atas"
            className="group relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-[#F48C06] via-[#f79b20] to-[#ffa42b] text-white shadow-xl shadow-[#F48C06]/35 border-2 border-white/90 hover:shadow-2xl hover:shadow-[#F48C06]/50 transition-shadow duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#F48C06]/30 select-none"
          >
            {/* Ambient Glow */}
            <span
              className="absolute inset-0 rounded-full bg-[#F48C06] blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300 -z-10 pointer-events-none"
              aria-hidden="true"
            />

            {/* Modern Arrow Icon */}
            <ArrowUp className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.6] transition-transform duration-200 group-hover:-translate-y-0.5" />

            {/* Floating Tooltip Pill on Desktop Hover */}
            <span className="hidden md:block absolute right-full mr-3.5 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-medium tracking-wide shadow-lg whitespace-nowrap opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none border border-white/10">
              Ke Paling Atas
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
