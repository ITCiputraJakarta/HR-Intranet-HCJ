import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkScrollPosition = () => {
      const windowScroll =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      // Also check any scrollable modal or containers in view
      let modalScroll = 0;
      const scrollables = document.querySelectorAll('.overflow-y-auto');
      scrollables.forEach((el) => {
        if (el.scrollTop > modalScroll) {
          modalScroll = el.scrollTop;
        }
      });

      const maxScroll = Math.max(windowScroll, modalScroll);
      setIsVisible(maxScroll > 260);
    };

    window.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition, { passive: true });
    document.addEventListener('scroll', checkScrollPosition, { passive: true, capture: true });

    checkScrollPosition();

    return () => {
      window.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
      document.removeEventListener('scroll', checkScrollPosition, true);
    };
  }, []);

  const scrollToTop = () => {
    // 1. Smooth scroll the main window & documents
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });

    document.documentElement.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });

    document.body.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });

    // 2. Smooth scroll any open modal dialogs or subcontainers
    const scrollables = document.querySelectorAll('.overflow-y-auto');
    scrollables.forEach((el) => {
      el.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth',
      });
    });
  };

  return (
    <div
      className={`fixed bottom-5 sm:bottom-7 right-5 sm:right-7 z-40 transition-all duration-300 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-6 scale-75 pointer-events-none'
      }`}
    >
      <button
        type="button"
        id="btn-scroll-to-top"
        onClick={scrollToTop}
        aria-label="Gulir ke paling atas"
        title="Gulir ke paling atas"
        className="group relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-[#F48C06] via-[#f79b20] to-[#ffa42b] text-white shadow-xl shadow-[#F48C06]/35 border-2 border-white/90 hover:shadow-2xl hover:shadow-[#F48C06]/50 hover:scale-105 active:scale-90 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#F48C06]/30 select-none"
      >
        {/* Ambient Glow */}
        <span
          className="absolute inset-0 rounded-full bg-[#F48C06] blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300 -z-10 pointer-events-none"
          aria-hidden="true"
        />

        {/* Modern Arrow Icon with subtle hover lift */}
        <ArrowUp className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.6] transition-transform duration-200 group-hover:-translate-y-1" />

        {/* Floating Tooltip Pill on Desktop Hover */}
        <span className="hidden md:block absolute right-full mr-3.5 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-medium tracking-wide shadow-lg whitespace-nowrap opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none border border-white/10">
          Ke Paling Atas
        </span>
      </button>
    </div>
  );
};
