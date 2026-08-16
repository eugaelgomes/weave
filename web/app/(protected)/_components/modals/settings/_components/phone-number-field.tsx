"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CountryCode } from "libphonenumber-js/min";
import {
  PHONE_COUNTRIES,
  PHONE_COUNTRY_BY_ISO,
  type PhoneCountry,
} from "@/app/_utils/phone-countries";

type PhoneNumberFieldProps = {
  countryIso: CountryCode;
  localNumber: string;
  onCountryChange: (iso: CountryCode) => void;
  onLocalNumberChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  inputClassName?: string;
};

export function PhoneNumberField({
  countryIso,
  localNumber,
  onCountryChange,
  onLocalNumberChange,
  onBlur,
  disabled = false,
  inputClassName = "",
}: PhoneNumberFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = PHONE_COUNTRY_BY_ISO.get(countryIso) ?? PHONE_COUNTRIES[0];

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const handleSelectCountry = (country: PhoneCountry) => {
    onCountryChange(country.iso);
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <div
        className={`flex h-8 w-full items-stretch overflow-hidden rounded-md transition-all ${inputClassName}`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Selecionar país e DDI"
          aria-expanded={isOpen}
          className="dark:border-surface-dark-border-strong flex shrink-0 items-center gap-1 border-r border-neutral-200 px-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800/40"
        >
          <span className="text-sm leading-none" aria-hidden>
            {selected.flag}
          </span>
          <span className="tabular-nums">+{selected.dialCode}</span>
          <ChevronDown
            size={10}
            className={`text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        <input
          type="tel"
          inputMode="numeric"
          disabled={disabled}
          value={localNumber}
          onChange={(e) => onLocalNumberChange(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={onBlur}
          placeholder="Número"
          className="min-w-0 flex-1 bg-transparent px-2.5 text-[12px] font-medium text-neutral-900 outline-none placeholder:text-neutral-400 disabled:opacity-50 dark:text-neutral-200"
        />
      </div>

      {isOpen && (
        <ul
          role="listbox"
          className="dark:border-surface-dark-border-strong absolute top-[calc(100%+4px)] left-0 z-20 max-h-48 w-56 overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:bg-[#1d1d1b]"
        >
          {PHONE_COUNTRIES.map((country) => (
            <li key={country.iso} role="option" aria-selected={country.iso === countryIso}>
              <button
                type="button"
                onClick={() => handleSelectCountry(country)}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${
                  country.iso === countryIso ? "bg-amber-50/80 dark:bg-amber-500/10" : ""
                }`}
              >
                <span className="text-sm leading-none">{country.flag}</span>
                <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">
                  {country.name}
                </span>
                <span className="shrink-0 text-neutral-400 tabular-nums">+{country.dialCode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
