import { forwardRef, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface FieldWrapperProps {
  label:     string;
  error?:    string;
  required?: boolean;
  hint?:     string;
  children:  ReactNode;
}

export function FieldWrapper({ label, error, required, hint, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <Label className={cn('text-xs font-medium', error ? 'text-red-400' : 'text-muted-foreground')}>
        {label}{required && <span className="text-gold-500 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
      {error && <p className="text-[11px] text-red-400 flex items-center gap-1">{error}</p>}
    </div>
  );
}

// ── Styled Input ──────────────────────────────────────────────────────────────

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label:     string;
  error?:    string;
  required?: boolean;
  hint?:     string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, required, hint, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} required={required} hint={hint}>
      <Input
        ref={ref}
        className={cn(error && 'border-red-500/50 focus-visible:ring-red-500/30', className)}
        {...props}
      />
    </FieldWrapper>
  ),
);
FormInput.displayName = 'FormInput';

// ── Styled Textarea ───────────────────────────────────────────────────────────

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label:     string;
  error?:    string;
  required?: boolean;
  hint?:     string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, required, hint, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} required={required} hint={hint}>
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[90px] w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 py-2 text-sm text-foreground',
          'placeholder:text-muted-foreground/50 resize-none',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50 focus-visible:border-gold-500/40',
          'disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200',
          error && 'border-red-500/50 focus-visible:ring-red-500/30',
          className,
        )}
        {...props}
      />
    </FieldWrapper>
  ),
);
FormTextarea.displayName = 'FormTextarea';

// ── Styled Select ─────────────────────────────────────────────────────────────

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label:     string;
  error?:    string;
  required?: boolean;
  hint?:     string;
  options:   { value: string; label: string }[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, required, hint, options, placeholder, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} required={required} hint={hint}>
      <select
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-lg border border-white/[0.08] bg-navy-800/60 px-3 py-1 text-sm text-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50 focus-visible:border-gold-500/40',
          'disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200',
          'appearance-none cursor-pointer',
          error && 'border-red-500/50',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-navy-900">
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  ),
);
FormSelect.displayName = 'FormSelect';

// ── Styled Checkbox ───────────────────────────────────────────────────────────

interface FormCheckboxProps {
  label:     ReactNode;
  error?:    string;
  checked?:  boolean;
  onChange?: (checked: boolean) => void;
  name?:     string;
}

export function FormCheckbox({ label, error, checked, onChange, name }: FormCheckboxProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-navy-800 accent-gold-500 cursor-pointer"
        />
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
          {label}
        </span>
      </label>
      {error && <p className="text-[11px] text-red-400 pl-7">{error}</p>}
    </div>
  );
}
