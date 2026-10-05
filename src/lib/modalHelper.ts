import React from 'react';

/**
 * Creates safe backdrop click handlers for modal overlays.
 * Prevents accidental modal closure when a user drags/selects text
 * in an input, table, or textarea and releases the mouse pointer
 * over the gray backdrop.
 * 
 * The modal will ONLY close when the user intentionally presses mousedown
 * directly ON the gray backdrop AND releases mouseup directly ON the gray backdrop.
 */
export function getBackdropProps(onClose: () => void) {
  return {
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.setAttribute('data-backdrop-active', 'true');
      } else {
        e.currentTarget.removeAttribute('data-backdrop-active');
      }
    },
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if (
        e.target === e.currentTarget &&
        e.currentTarget.getAttribute('data-backdrop-active') === 'true'
      ) {
        e.currentTarget.removeAttribute('data-backdrop-active');
        onClose();
      }
      e.currentTarget.removeAttribute('data-backdrop-active');
    },
  };
}
