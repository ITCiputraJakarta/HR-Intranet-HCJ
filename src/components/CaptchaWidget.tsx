import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { Language } from '../lib/i18n';

export interface CaptchaWidgetRef {
  isValid: () => boolean;
  reset: () => void;
  getValue: () => string;
  getCode: () => string;
}

interface CaptchaWidgetProps {
  currentLang?: Language;
  onValidChange?: (isValid: boolean) => void;
  idPrefix?: string;
  className?: string;
}

const CHAR_POOL = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRandomCode(length = 5): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHAR_POOL.charAt(Math.floor(Math.random() * CHAR_POOL.length));
  }
  return result;
}

export const CaptchaWidget = forwardRef<CaptchaWidgetRef, CaptchaWidgetProps>(
  ({ currentLang = 'id', onValidChange, idPrefix = 'auth', className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [captchaCode, setCaptchaCode] = useState<string>('');
    const [userInput, setUserInput] = useState<string>('');
    const [isMatched, setIsMatched] = useState<boolean>(false);
    const [touched, setTouched] = useState<boolean>(false);

    const isId = currentLang === 'id';

    const drawCaptcha = (code: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#f1f5f9');
      grad.addColorStop(0.5, '#e2e8f0');
      grad.addColorStop(1, '#ede9fe');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Noise lines
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 + Math.random() * 0.25})`;
        ctx.lineWidth = 1 + Math.random() * 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.bezierCurveTo(
          Math.random() * width,
          Math.random() * height,
          Math.random() * width,
          Math.random() * height,
          Math.random() * width,
          Math.random() * height
        );
        ctx.stroke();
      }

      // Noise dots
      for (let i = 0; i < 35; i++) {
        ctx.fillStyle = `rgba(79, 70, 229, ${0.2 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw characters with distinct rotations
      const charWidth = width / (code.length + 1);
      const fontFamilies = ['Arial', 'Verdana', 'Trebuchet MS', 'Impact'];

      for (let i = 0; i < code.length; i++) {
        const char = code[i];
        ctx.save();
        const x = (i + 0.8) * charWidth;
        const y = height / 2 + Math.sin(i) * 3;

        ctx.translate(x, y);
        const angle = (Math.random() - 0.5) * 0.45;
        ctx.rotate(angle);

        const fontFam = fontFamilies[Math.floor(Math.random() * fontFamilies.length)];
        ctx.font = `bold ${22 + Math.floor(Math.random() * 4)}px ${fontFam}, sans-serif`;

        // Alternating colors between deep indigo, slate, and violet
        const colors = ['#1e1b4b', '#312e81', '#3730a3', '#1e293b', '#0f172a'];
        ctx.fillStyle = colors[i % colors.length];
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, 0, 0);

        ctx.restore();
      }
    };

    const refreshCaptcha = () => {
      const newCode = generateRandomCode(5);
      setCaptchaCode(newCode);
      setUserInput('');
      setIsMatched(false);
      setTouched(false);
      onValidChange?.(false);
      // Wait for next tick so canvas is rendered
      setTimeout(() => {
        drawCaptcha(newCode);
      }, 50);
    };

    useEffect(() => {
      refreshCaptcha();
    }, []);

    const handleInputChange = (val: string) => {
      const clean = val.toUpperCase().trim();
      setUserInput(clean);
      setTouched(true);
      const match = clean === captchaCode;
      setIsMatched(match);
      onValidChange?.(match);
    };

    useImperativeHandle(ref, () => ({
      isValid: () => userInput.toUpperCase().trim() === captchaCode,
      reset: () => refreshCaptcha(),
      getValue: () => userInput.toUpperCase().trim(),
      getCode: () => captchaCode,
    }));

    return (
      <div className={`space-y-2 ${className}`}>
        <label
          htmlFor={`${idPrefix}-captcha-input`}
          className="block text-xs font-bold text-slate-700 flex items-center justify-between"
        >
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isId ? 'Verifikasi Kode Captcha' : 'Security Captcha Verification'}</span>
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            {isId ? 'Karakter acak sistem' : 'Case-insensitive'}
          </span>
        </label>

        <div className="flex items-center gap-2">
          {/* Visual Canvas Box */}
          <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-2xs bg-slate-100 flex items-center justify-center shrink-0">
            <canvas
              ref={canvasRef}
              width={140}
              height={42}
              className="block cursor-pointer select-none"
              onClick={refreshCaptcha}
              title={isId ? 'Klik untuk mengganti kode' : 'Click to refresh code'}
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={refreshCaptcha}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-600 transition-all active:scale-95 shadow-2xs shrink-0"
            title={isId ? 'Muat ulang kode captcha' : 'Reload captcha code'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* User Input Field */}
          <div className="relative flex-1">
            <input
              id={`${idPrefix}-captcha-input`}
              type="text"
              autoComplete="off"
              spellCheck="false"
              maxLength={6}
              value={userInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={isId ? 'Ketik kode' : 'Enter code'}
              className={`block w-full px-3 py-2 text-xs rounded-xl border font-bold uppercase tracking-wider transition-colors ${
                touched
                  ? isMatched
                    ? 'border-emerald-400 bg-emerald-50/30 text-emerald-900 focus:ring-emerald-500'
                    : 'border-rose-300 bg-rose-50/30 text-rose-900 focus:ring-rose-500'
                  : 'border-slate-300 bg-white text-slate-900 focus:ring-indigo-600'
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

        {touched && !isMatched && userInput.length > 0 && (
          <p className="text-[11px] text-rose-600 font-medium">
            {isId ? 'Kode captcha belum sesuai. Harap periksa kembali.' : 'Captcha code does not match. Please re-enter.'}
          </p>
        )}
      </div>
    );
  }
);
