import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  cornerHint?: React.ReactNode;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      cornerHint,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className,
      type = 'text',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : generatedId);
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const describedBy = error ? errorId : helperText ? helperId : undefined;

    return (
      <div className="w-full space-y-1.5">
        {(label || cornerHint) && (
          <div className="flex items-center justify-between gap-2">
            {label ? (
              <label
                htmlFor={inputId}
                className="block text-xs font-medium text-slate-300 select-none cursor-pointer"
              >
                {label}
              </label>
            ) : (
              <span />
            )}
            {cornerHint && (
              <div className="text-xs text-indigo-400 flex items-center">{cornerHint}</div>
            )}
          </div>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center z-10">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            style={{
              paddingLeft: leftIcon ? '2.75rem' : '0.875rem',
              paddingRight: rightIcon ? '2.75rem' : '0.875rem',
              ...props.style,
            }}
            className={cn(
              'w-full h-11 bg-[#0d1424]/90 border border-white/10 rounded-xl py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:bg-slate-900',
              error && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center z-10">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-rose-400 font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

