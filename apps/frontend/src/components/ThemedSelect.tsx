"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export type ThemedSelectOption = { value: string; label: string };

type ThemedSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: ThemedSelectOption[];
  placeholder?: string;
  className?: string;
  /** Optional: align dropdown menu (e.g. "right" for RTL or narrow containers) */
  align?: "left" | "right";
};

export function ThemedSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
  align = "left",
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 pl-3 pr-9 flex items-center text-sm bg-gray-900/50 border border-gray-700 rounded-lg text-white hover:border-gray-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors relative"
      >
        <span className={`truncate ${selectedOption ? "text-white" : "text-gray-500"}`}>
          {displayLabel}
        </span>
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          className={`absolute z-50 mt-1 py-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-700 bg-gray-800 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  opt.value === value
                    ? "bg-orange-500/20 text-orange-400"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
