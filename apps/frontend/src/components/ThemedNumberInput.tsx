"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

type ThemedNumberInputProps = {
  value: number | "";
  onChange: (value: number | "") => void;
  step?: number;
  min?: number;
  className?: string;
  /** Allow empty string (no default to 0 on change) */
  allowEmpty?: boolean;
};

export function ThemedNumberInput({
  value,
  onChange,
  step = 1,
  min = undefined,
  className = "",
  allowEmpty = false,
}: ThemedNumberInputProps) {
  const num = typeof value === "number" ? value : (min ?? 0);
  const isEmpty = value === "";

  const handleStep = (delta: number) => {
    if (isEmpty) {
      onChange(min ?? 0);
      return;
    }
    const next = num + delta;
    const clamped = min != null && next < min ? min : next;
    const rounded = step >= 1 ? Math.round(clamped) : Number((clamped).toFixed(2));
    onChange(rounded);
  };

  return (
    <div
      className={`flex items-stretch rounded-lg border border-gray-600 bg-gray-800 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500/50 ${className}`}
    >
      <input
        type="number"
        step={step}
        min={min}
        value={isEmpty ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" && allowEmpty) {
            onChange("");
            return;
          }
          const n = step >= 1 ? parseInt(raw, 10) : parseFloat(raw);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="themed-number-input w-full min-w-0 bg-transparent px-4 py-2 text-white focus:outline-none"
      />
      <div className="flex flex-col border-l border-gray-600">
        <button
          type="button"
          onClick={() => handleStep(step)}
          className="flex flex-1 items-center justify-center px-2 text-gray-400 hover:bg-gray-700 hover:text-orange-400 transition-colors rounded-tr-lg min-h-[20px]"
          aria-label="Increment"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleStep(-step)}
          className="flex flex-1 items-center justify-center px-2 text-gray-400 hover:bg-gray-700 hover:text-orange-400 transition-colors rounded-br-lg min-h-[20px]"
          aria-label="Decrement"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
