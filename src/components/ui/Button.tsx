import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary:
        'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-[0.98] border border-indigo-400/20',
      gradient:
        'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white shadow-lg shadow-purple-500/25 active:scale-[0.98] border border-white/20',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 active:scale-[0.98]',
      glass:
        'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 backdrop-blur-md active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white active:scale-[0.98]',
      danger:
        'bg-rose-600/80 hover:bg-rose-600 text-white shadow-md shadow-rose-600/20 active:scale-[0.98] border border-rose-500/30',
    };

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5 font-medium',
      md: 'text-sm px-4 py-2 rounded-xl gap-2 font-medium',
      lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5 font-semibold',
      icon: 'p-2 rounded-xl aspect-square',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-150 select-none outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Spinner size="sm" className="text-current" />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
