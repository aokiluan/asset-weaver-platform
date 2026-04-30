import * as React from "react";
import { cn } from "@/lib/utils";

const formatBRL = (n: number | null | undefined) =>
  n == null || Number.isNaN(n)
    ? ""
    : n.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const parseBRL = (s: string): number | null => {
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits) / 100;
};

export interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
  > {
  value?: number | null;
  onValueChange?: (value: number | null) => void;
  /** When used with react-hook-form Controller, you can pass onChange directly */
  onChange?: (value: number | null) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, onChange, placeholder, ...props }, ref) => {
    const display = formatBRL(value ?? null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseBRL(e.target.value);
      onValueChange?.(parsed);
      onChange?.(parsed);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        placeholder={placeholder ?? "R$ 0,00"}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput, formatBRL, parseBRL };
