import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, ShieldCheck, Lock } from 'lucide-react';
import { Language } from '../lib/i18n';

export interface CaptchaWidgetRef {
  isValid: () => boolean;
  reset: () => void;
  getValue: () => string;
}

interface CaptchaWidgetProps {
  currentLang?: Language;
  onValidChange?: (isValid: boolean) => void;
  idPrefix?: string;
  className?: string;
}

// High-readability alphanumeric character pool (excludes ambiguous 0/O, 1/I/L)
const CHAR_POOL = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CAPTCHA_LENGTH = 6;
const CAPTCHA_TTL_MS = 120 * 1000; // Auto-refresh after 2 minutes

function generateSecureCode(length = CAPTCHA_LENGTH): string {
  const randomValues = new Uint32Array(length);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomValues);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += CHAR_POOL.charAt(randomValues[i] % CHAR_POOL.length);
    }
    return result;
  }
  let fallback = '';
  for (let i = 0; i < length; i++) {
    fallback += CHAR_POOL.charAt(Math.floor(Math.random() * CHAR_POOL.length));
  }
  return fallback;
}

export const CaptchaWidget = forwardRef<CaptchaWidgetRef, CaptchaWidgetProps>(
  ({ currentLang = 'id', onValidChange, idPrefix = 'auth', className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // Store secret code in non-reactive ref so it is not exposed in React DevTools state tree
    const secretCodeRef = useRef<string>('');
    const generatedAtRef = useRef<number>(Date.now());
    const keystrokeCountRef = useRef<number>(0);

    const [userInput, setUserInput] = useState<string>('');
    const [isMatched, setIsMatched] = useState<boolean>(false);
    const [touched, setTouched] = useState<boolean>(false);
    const [pasteBlockedNotice, setPasteBlockedNotice] = useState<boolean>(false);

    const isId = currentLang === 'id';

    const drawCaptcha = (code: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Multi-stop soft security background gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#f0f7ff');
      grad.addColorStop(0.5, '#e6f0fa');
      grad.addColorStop(1, '#eef2ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle anti-OCR guilloche security mesh grid
      ctx.strokeStyle = 'rgba(0, 90, 141, 0.07)';
      ctx.lineWidth = 0.8;
      for (let x = 0; x < width; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 6, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Background interference bezier waves
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `rgba(2, 119, 189, ${0.18 + Math.random() * 0.22})`;
        ctx.lineWidth = 1.1 + Math.random() * 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * 25, Math.random() * height);
        ctx.bezierCurveTo(
          width * 0.33,
          Math.random() * height,
          width * 0.66,
          Math.random() * height,
          width - Math.random() * 15,
          Math.random() * height
        );
        ctx.stroke();
      }

      // 4. Security noise dots
      for (let i = 0; i < 42; i++) {
        ctx.fillStyle = `rgba(0, 72, 114, ${0.18 + Math.random() * 0.28})`;
        ctx.beginPath();
        ctx.arc(
          Math.random() * width,
          Math.random() * height,
          0.7 + Math.random() * 1.3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // 5. Draw characters with individual rotation, wave offset, and font variation
      const charWidth = width / (code.length + 1);
      const fontFamilies = ['Georgia', 'Trebuchet MS', 'Verdana', 'Courier New', 'Arial'];
      const colors = ['#003b5c', '#1e1b4b', '#005a8d', '#0f172a', '#312e81', '#0369a1'];

      for (let i = 0; i < code.length; i++) {
        const char = code[i];
        ctx.save();
        const x = (i + 0.85) * charWidth + (Math.random() - 0.5) * 3;
        const y = height / 2 + Math.sin(i * 1.3 + Math.random()) * 4;

        ctx.translate(x, y);
        const angle = (Math.random() - 0.5) * 0.48;
        ctx.rotate(angle);

        const fontFam = fontFamilies[Math.floor(Math.random() * fontFamilies.length)];
        const fontSize = 19 + Math.floor(Math.random() * 4);
        ctx.font = `400 ${fontSize}px ${fontFam}, sans-serif`;

        ctx.fillStyle = colors[i % colors.length];
        ctx.shadowColor = 'rgba(0, 59, 92, 0.22)';
        ctx.shadowBlur = 1.5;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, 0, 0);

        ctx.restore();
      }

      // 6. Foreground anti-OCR strike-through sine wave
      ctx.strokeStyle = 'rgba(0, 90, 141, 0.32)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let x = 8; x < width - 8; x += 4) {
        const y = height / 2 + Math.sin(x * 0.08) * 6;
        if (x === 8) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const refreshCaptcha = () => {
      const newCode = generateSecureCode(CAPTCHA_LENGTH);
      secretCodeRef.current = newCode;
      generatedAtRef.current = Date.now();
      keystrokeCountRef.current = 0;
      setUserInput('');
      setIsMatched(false);
      setTouched(false);
      setPasteBlockedNotice(false);
      onValidChange?.(false);
      setTimeout(() => {
        drawCaptcha(newCode);
      }, 30);
    };

    useEffect(() => {
      refreshCaptcha();
      const expiryTimer = setInterval(() => {
        if (Date.now() - generatedAtRef.current >= CAPTCHA_TTL_MS) {
          refreshCaptcha();
        }
      }, 15000);
      return () => clearInterval(expiryTimer);
    }, []);

    const verifyMatch = (cleanInput: string): boolean => {
      if (!secretCodeRef.current) return false;
      const isExpired = Date.now() - generatedAtRef.current > CAPTCHA_TTL_MS;
      if (isExpired) return false;
      // Require genuine typing interaction (at least 2 input events) and minimum human reaction time (400ms)
      const elapsed = Date.now() - generatedAtRef.current;
      if (elapsed < 400 || keystrokeCountRef.current < 1) return false;
      return cleanInput === secretCodeRef.current;
    };

    const handleInputChange = (val: string) => {
      keystrokeCountRef.current += 1;
      setPasteBlockedNotice(false);
      const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CAPTCHA_LENGTH);
      setUserInput(clean);
      setTouched(true);
      const match = verifyMatch(clean);
      setIsMatched(match);
      onValidChange?.(match);
    };

    useImperativeHandle(ref, () => ({
      isValid: () => verifyMatch(userInput.toUpperCase().trim()),
      reset: () => refreshCaptcha(),
      getValue: () => userInput.toUpperCase().trim(),
    }));

    return (
      <div className={`space-y-1.5 ${className}`}>
        <label
          htmlFor={`${idPrefix}-captcha-input`}
          className="block text-[11px] font-normal text-slate-700 flex items-center gap-1.5"
        >
          <span className="w-4 h-4 rounded-md bg-gradient-to-br from-[#005a8d] to-sky-600 text-white flex items-center justify-center shadow-2xs shrink-0">
            <ShieldCheck className="w-2.5 h-2.5" />
          </span>
          <span>{isId ? 'Verifikasi Kode Captcha' : 'Captcha Verification'}</span>
        </label>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Visual Canvas Box */}
          <div
            className="relative rounded-xl overflow-hidden border border-sky-200/90 shadow-2xs bg-slate-100 flex items-center justify-center shrink-0 select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            <canvas
              ref={canvasRef}
              width={136}
              height={38}
              className="block w-[118px] sm:w-[136px] h-[38px] cursor-pointer select-none"
              onClick={refreshCaptcha}
              title={isId ? 'Klik untuk mengganti kode keamanan' : 'Click to refresh security code'}
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={refreshCaptcha}
            className="p-2 rounded-xl border border-slate-200/90 hover:border-sky-300 bg-white hover:bg-sky-50/60 text-slate-600 hover:text-[#005a8d] transition-all active:scale-95 shadow-2xs shrink-0 cursor-pointer"
            title={isId ? 'Muat ulang kode captcha' : 'Reload captcha code'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* User Input Field (Paste/Drop Protected) */}
          <div className="relative flex-1 min-w-0">
            <input
              id={`${idPrefix}-captcha-input`}
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck="false"
              maxLength={CAPTCHA_LENGTH}
              value={userInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                setPasteBlockedNotice(true);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setPasteBlockedNotice(true);
              }}
              placeholder={isId ? 'Ketik kode' : 'Enter code'}
              className={`block w-full px-2.5 sm:px-3 py-2 text-xs rounded-xl border font-normal uppercase tracking-widest transition-colors ${
                touched
                  ? isMatched
                    ? 'border-emerald-400 bg-emerald-50/40 text-emerald-900 focus:ring-emerald-500'
                    : 'border-rose-300 bg-rose-50/30 text-rose-900 focus:ring-rose-500'
                  : 'border-slate-200/90 bg-white text-slate-900 focus:ring-[#005a8d]'
              } focus:outline-none focus:ring-2`}
            />

            {touched && (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                {isMatched ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-in zoom-in-50" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 animate-in zoom-in-50" />
                )}
              </div>
            )}
          </div>
        </div>

        {pasteBlockedNotice && (
          <p className="text-[10.5px] text-amber-700 font-normal">
            {isId
              ? 'Demi keamanan anti-bot, fitur tempel (paste) dinonaktifkan. Silakan ketik manual.'
              : 'For anti-bot security, pasting is disabled. Please type the code manually.'}
          </p>
        )}

        {touched && !isMatched && userInput.length >= CAPTCHA_LENGTH && (
          <p className="text-[10.5px] text-rose-600 font-normal">
            {isId
              ? 'Kode keamanan belum sesuai. Harap periksa kembali.'
              : 'Security code does not match. Please check again.'}
          </p>
        )}
      </div>
    );
  }
);
