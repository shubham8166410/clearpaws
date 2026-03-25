"use client";

import { useState, useRef, useEffect, useId } from "react";

interface SelectOption {
  value: string;
  label: string;
  note?: string;
  icon?: string; // e.g. flag emoji
}

interface SelectProps {
  label?: string;
  hint?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  id?: string;
}

export function Select({
  label,
  hint,
  placeholder = "Search…",
  options,
  value,
  onChange,
  error,
  required,
  id: externalId,
}: SelectProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query.length > 0
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function handler(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler as EventListener);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler as EventListener);
    };
  }, []);

  function handleSelect(opt: SelectOption) {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); setQuery(""); }
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      {label && (
        <label htmlFor={`${id}-input`} className="text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      {hint && (
        <p className="text-xs text-gray-500 -mt-1">{hint}</p>
      )}

      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={[
          "w-full text-left px-4 py-3 rounded-xl border transition-colors min-h-[48px]",
          "flex items-center justify-between gap-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent",
          error ? "border-red-400 bg-red-50" : "border-card-border bg-white hover:border-gray-400",
          selected ? "text-gray-900" : "text-gray-400",
        ].join(" ")}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.icon && <span aria-hidden="true">{selected.icon}</span>}
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white border border-card-border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-2.5 border-b border-gray-100">
            <input
              ref={inputRef}
              id={`${id}-input`}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-card-border focus:outline-none focus:ring-2 focus:ring-brand-600 placeholder-gray-400"
              style={{ fontSize: "16px" }}
              aria-label={label ? `Search ${label}` : "Search"}
              autoComplete="off"
            />
          </div>
          <ul
            id={`${id}-listbox`}
            role="listbox"
            aria-label={label}
            className="max-h-60 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400">No countries found</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => handleSelect(opt)}
                  className={[
                    "px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2.5",
                    opt.value === value
                      ? "bg-brand-50 text-brand-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {opt.icon && <span aria-hidden="true" className="text-base flex-shrink-0">{opt.icon}</span>}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.note && (
                    <span className="text-xs text-gray-400 flex-shrink-0">{opt.note}</span>
                  )}
                  {opt.value === value && (
                    <svg className="w-4 h-4 text-brand-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
