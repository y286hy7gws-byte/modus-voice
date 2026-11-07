"use client";

import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { X, Check, ChevronDown } from "lucide-react";
import { cn, initials } from "@/lib/utils";

/* ------------------------------ Button ------------------------------ */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "good";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "btn",
        size === "sm" && "btn-sm",
        size === "md" && "btn-md",
        size === "lg" && "btn-lg",
        size === "icon" && "btn-icon",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary",
        variant === "ghost" && "btn-ghost",
        variant === "danger" && "btn-danger",
        variant === "good" && "btn-good",
        className,
      )}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
});

/* ------------------------------ Fields ------------------------------ */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn("field field-md", className)} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cn("field py-2.5 resize-y min-h-[88px]", className)} {...rest} />;
  },
);

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="mt-1.5 text-[12px] font-medium text-bad-600">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-[12px] text-ink-400">{hint}</p>}
    </div>
  );
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn("field field-md appearance-none pr-9 cursor-pointer", className)} {...rest}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
    );
  },
);

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-xl border border-ink-200 bg-ink-50 p-1 gap-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-all duration-150",
            value === o.value
              ? "bg-surface text-ink-900 shadow-card"
              : "text-ink-500 hover:text-ink-800",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 text-left"
    >
      <span
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-brand-600" : "bg-ink-200",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      {(label || description) && (
        <span>
          {label && <span className="block text-[13.5px] font-semibold text-ink-900">{label}</span>}
          {description && <span className="mt-0.5 block text-[12.5px] text-ink-500">{description}</span>}
        </span>
      )}
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-left"
    >
      <span
        className={cn(
          "flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-all duration-150",
          checked ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 bg-surface hover:border-ink-400",
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {label && <span className="text-[13px] text-ink-700">{label}</span>}
    </button>
  );
}

/* ------------------------------ Surfaces ------------------------------ */

export function Card({
  children,
  className,
  interactive,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("card", interactive && "transition-all duration-150 hover:shadow-pop hover:border-ink-200", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">{children}</h2>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center anim-fade-up">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <h3 className="text-[15px] font-bold text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({
  name,
  color,
  size = 32,
  className,
}: {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: color ?? "#4f46e5",
      }}
      title={name}
    >
      {initials(name || "?")}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-[system-ui] text-[11px] font-semibold text-ink-500">
      {children}
    </kbd>
  );
}

/* ------------------------------ Modal ------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="anim-fade absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "anim-scale-in relative w-full rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl",
          width,
          "max-h-[92vh] overflow-y-auto",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-ink-900">{title}</h3>
            {description && <p className="mt-0.5 text-[12.5px] text-ink-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            aria-label="Закрыть"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------ Dropdown ------------------------------ */

export function Menu({
  trigger,
  children,
  align = "right",
  width = "w-56",
}: {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            "anim-scale-in absolute z-50 mt-2 overflow-hidden rounded-xl border border-ink-100 bg-surface py-1.5 shadow-pop",
            width,
            align === "right" ? "right-0" : "left-0",
          )}
          onClick={() => setOpen(false)}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  active,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium transition-colors",
        danger ? "text-bad-600 hover:bg-bad-50" : "text-ink-700 hover:bg-ink-50 hover:text-ink-900",
        active && "text-brand-600 bg-brand-50/60",
      )}
    >
      {icon && <span className="text-ink-400">{icon}</span>}
      {children}
    </button>
  );
}

export const MenuItemDivider = () => <div className="my-1 h-px bg-ink-100" />;
