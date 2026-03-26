"use client";

import { useState, useRef, useEffect, useId, useCallback } from "react";
import { getBreedsFromCache, refreshBreedsCache, type CachedBreedEntry } from "@/lib/breeds-cache";

// ── Breed data ────────────────────────────────────────────────────────────────
// banned: true = cannot enter Australia under DAFF biosecurity law

interface BreedEntry {
  name: string;
  banned?: true;
  bannedNote?: string;
}

export const DOG_BREED_DATA: BreedEntry[] = [
  { name: "Affenpinscher" },
  { name: "Afghan Hound" },
  { name: "Airedale Terrier" },
  { name: "Akita" },
  { name: "Alaskan Klee Kai" },
  { name: "Alaskan Malamute" },
  { name: "American Bulldog" },
  { name: "American English Coonhound" },
  { name: "American Eskimo Dog" },
  { name: "American Foxhound" },
  { name: "American Hairless Terrier" },
  { name: "American Staffordshire Terrier" },
  { name: "American Water Spaniel" },
  { name: "Anatolian Shepherd Dog" },
  { name: "Australian Cattle Dog" },
  { name: "Australian Shepherd" },
  { name: "Australian Terrier" },
  { name: "Azawakh" },
  { name: "Barbet" },
  { name: "Basenji" },
  { name: "Basset Hound" },
  { name: "Beagle" },
  { name: "Bearded Collie" },
  { name: "Bedlington Terrier" },
  { name: "Belgian Malinois" },
  { name: "Belgian Sheepdog" },
  { name: "Belgian Tervuren" },
  { name: "Bergamasco Sheepdog" },
  { name: "Berger Picard" },
  { name: "Bernese Mountain Dog" },
  { name: "Bichon Frise" },
  { name: "Biewer Terrier" },
  { name: "Black and Tan Coonhound" },
  { name: "Black Russian Terrier" },
  { name: "Bloodhound" },
  { name: "Bluetick Coonhound" },
  { name: "Boerboel" },
  { name: "Border Collie" },
  { name: "Border Terrier" },
  { name: "Borzoi" },
  { name: "Boston Terrier" },
  { name: "Bouvier des Flandres" },
  { name: "Boxer" },
  { name: "Boykin Spaniel" },
  { name: "Briard" },
  { name: "Brittany" },
  { name: "Brussels Griffon" },
  { name: "Bull Terrier" },
  { name: "Bulldog" },
  { name: "Bullmastiff" },
  { name: "Cairn Terrier" },
  { name: "Canaan Dog" },
  { name: "Cane Corso" },
  { name: "Cardigan Welsh Corgi" },
  { name: "Caucasian Shepherd Dog" },
  { name: "Cavalier King Charles Spaniel" },
  { name: "Cesky Terrier" },
  { name: "Chesapeake Bay Retriever" },
  { name: "Chihuahua" },
  { name: "Chinese Crested" },
  { name: "Chinese Shar-Pei" },
  { name: "Chow Chow" },
  { name: "Cirneco dell'Etna" },
  { name: "Clumber Spaniel" },
  { name: "Cocker Spaniel" },
  { name: "Collie" },
  { name: "Coton de Tulear" },
  { name: "Curly-Coated Retriever" },
  { name: "Dachshund" },
  { name: "Dalmatian" },
  { name: "Dandie Dinmont Terrier" },
  { name: "Dobermann" },
  {
    name: "Dogo Argentino",
    banned: true,
    bannedNote: "Banned under Australian biosecurity law — cannot be imported.",
  },
  { name: "Dutch Shepherd" },
  { name: "English Cocker Spaniel" },
  { name: "English Foxhound" },
  { name: "English Setter" },
  { name: "English Springer Spaniel" },
  { name: "English Toy Spaniel" },
  { name: "Entlebucher Mountain Dog" },
  { name: "Field Spaniel" },
  {
    name: "Fila Brasileiro",
    banned: true,
    bannedNote: "Banned under Australian biosecurity law — cannot be imported.",
  },
  { name: "Finnish Lapphund" },
  { name: "Finnish Spitz" },
  { name: "Flat-Coated Retriever" },
  { name: "French Bulldog" },
  { name: "German Pinscher" },
  { name: "German Shepherd" },
  { name: "German Shorthaired Pointer" },
  { name: "German Wirehaired Pointer" },
  { name: "Giant Schnauzer" },
  { name: "Glen of Imaal Terrier" },
  { name: "Golden Retriever" },
  { name: "Gordon Setter" },
  { name: "Great Dane" },
  { name: "Great Pyrenees" },
  { name: "Greater Swiss Mountain Dog" },
  { name: "Greyhound" },
  { name: "Harrier" },
  { name: "Havanese" },
  { name: "Hovawart" },
  { name: "Ibizan Hound" },
  { name: "Icelandic Sheepdog" },
  { name: "Irish Red and White Setter" },
  { name: "Irish Setter" },
  { name: "Irish Terrier" },
  { name: "Irish Water Spaniel" },
  { name: "Irish Wolfhound" },
  { name: "Italian Greyhound" },
  { name: "Jack Russell Terrier" },
  {
    name: "Japanese Tosa",
    banned: true,
    bannedNote: "Banned under Australian biosecurity law — cannot be imported.",
  },
  { name: "Keeshond" },
  { name: "Kerry Blue Terrier" },
  { name: "Komondor" },
  { name: "Kooikerhondje" },
  { name: "Kuvasz" },
  { name: "Labrador Retriever" },
  { name: "Lagotto Romagnolo" },
  { name: "Lakeland Terrier" },
  { name: "Lancashire Heeler" },
  { name: "Leonberger" },
  { name: "Lhasa Apso" },
  { name: "Lowchen" },
  { name: "Maltese" },
  { name: "Manchester Terrier" },
  { name: "Mastiff" },
  { name: "Miniature Bull Terrier" },
  { name: "Miniature Pinscher" },
  { name: "Miniature Schnauzer" },
  { name: "Mudi" },
  { name: "Neapolitan Mastiff" },
  { name: "Newfoundland" },
  { name: "Norfolk Terrier" },
  { name: "Norwegian Buhund" },
  { name: "Norwegian Elkhound" },
  { name: "Norwegian Lundehund" },
  { name: "Norwich Terrier" },
  { name: "Nova Scotia Duck Tolling Retriever" },
  { name: "Old English Sheepdog" },
  { name: "Otterhound" },
  { name: "Papillon" },
  { name: "Parson Russell Terrier" },
  { name: "Pekingese" },
  { name: "Pembroke Welsh Corgi" },
  {
    name: "Perro de Presa Canario",
    banned: true,
    bannedNote: "Banned under Australian biosecurity law — cannot be imported.",
  },
  { name: "Petit Basset Griffon Vendeen" },
  { name: "Pharaoh Hound" },
  { name: "Plott Hound" },
  { name: "Pointer" },
  { name: "Polish Lowland Sheepdog" },
  { name: "Pomeranian" },
  { name: "Poodle (Miniature)" },
  { name: "Poodle (Standard)" },
  { name: "Poodle (Toy)" },
  { name: "Portuguese Podengo" },
  { name: "Portuguese Water Dog" },
  { name: "Pug" },
  { name: "Puli" },
  { name: "Pumi" },
  { name: "Pyrenean Shepherd" },
  { name: "Rat Terrier" },
  { name: "Redbone Coonhound" },
  { name: "Rhodesian Ridgeback" },
  { name: "Rottweiler" },
  { name: "Russell Terrier" },
  { name: "Saint Bernard" },
  { name: "Saluki" },
  { name: "Samoyed" },
  { name: "Schipperke" },
  { name: "Scottish Deerhound" },
  { name: "Scottish Terrier" },
  { name: "Sealyham Terrier" },
  { name: "Shetland Sheepdog" },
  { name: "Shiba Inu" },
  { name: "Shih Tzu" },
  { name: "Siberian Husky" },
  { name: "Silky Terrier" },
  { name: "Skye Terrier" },
  { name: "Sloughi" },
  { name: "Smooth Fox Terrier" },
  { name: "Spanish Water Dog" },
  { name: "Spinone Italiano" },
  { name: "Staffordshire Bull Terrier" },
  { name: "Standard Schnauzer" },
  { name: "Sussex Spaniel" },
  { name: "Swedish Lapphund" },
  { name: "Swedish Vallhund" },
  { name: "Tibetan Mastiff" },
  { name: "Tibetan Spaniel" },
  { name: "Tibetan Terrier" },
  { name: "Toy Fox Terrier" },
  { name: "Treeing Walker Coonhound" },
  { name: "Vizsla" },
  { name: "Weimaraner" },
  { name: "Welsh Springer Spaniel" },
  { name: "Welsh Terrier" },
  { name: "West Highland White Terrier" },
  { name: "Whippet" },
  { name: "Wire Fox Terrier" },
  { name: "Wirehaired Pointing Griffon" },
  { name: "Wirehaired Vizsla" },
  { name: "Xoloitzcuintli" },
  { name: "Yorkshire Terrier" },
  { name: "Mixed breed / Crossbreed" },
];

export const CAT_BREED_DATA: BreedEntry[] = [
  { name: "Abyssinian" },
  { name: "American Bobtail" },
  { name: "American Curl" },
  { name: "American Shorthair" },
  { name: "American Wirehair" },
  { name: "Australian Mist" },
  { name: "Balinese" },
  {
    name: "Bengal",
    banned: true,
    bannedNote: "Banned from import to Australia as of March 2026 — DAFF regulation.",
  },
  { name: "Birman" },
  { name: "Bombay" },
  { name: "British Longhair" },
  { name: "British Shorthair" },
  { name: "Burmese" },
  { name: "Burmilla" },
  { name: "Chartreux" },
  { name: "Chausie" },
  { name: "Colorpoint Shorthair" },
  { name: "Cornish Rex" },
  { name: "Cymric" },
  { name: "Devon Rex" },
  { name: "Donskoy / Don Sphynx" },
  { name: "Egyptian Mau" },
  { name: "European Shorthair" },
  { name: "Exotic Shorthair" },
  { name: "Havana Brown" },
  { name: "Highlander" },
  { name: "Himalayan" },
  { name: "Japanese Bobtail" },
  { name: "Javanese" },
  { name: "Khao Manee" },
  { name: "Korat" },
  { name: "Kurilian Bobtail" },
  { name: "LaPerm" },
  { name: "Lykoi" },
  { name: "Maine Coon" },
  { name: "Manx" },
  { name: "Munchkin" },
  { name: "Nebelung" },
  { name: "Norwegian Forest Cat" },
  { name: "Ocicat" },
  { name: "Oriental Longhair" },
  { name: "Oriental Shorthair" },
  { name: "Persian" },
  { name: "Peterbald" },
  { name: "Pixie-bob" },
  { name: "Ragamuffin" },
  { name: "Ragdoll" },
  { name: "Russian Blue" },
  {
    name: "Savannah",
    banned: true,
    bannedNote: "Hybrid species — cannot enter Australia under DAFF biosecurity law.",
  },
  { name: "Scottish Fold" },
  { name: "Scottish Straight" },
  { name: "Selkirk Rex" },
  { name: "Serengeti" },
  { name: "Siamese" },
  { name: "Siberian" },
  { name: "Singapura" },
  { name: "Snowshoe" },
  { name: "Sokoke" },
  { name: "Somali" },
  { name: "Sphynx" },
  { name: "Thai" },
  { name: "Tonkinese" },
  { name: "Toyger" },
  { name: "Turkish Angora" },
  { name: "Turkish Van" },
  { name: "Domestic Shorthair" },
  { name: "Domestic Longhair" },
  { name: "Domestic Mediumhair" },
  { name: "Mixed breed" },
];

// Flat name lists for legacy usage
export const DOG_BREEDS = DOG_BREED_DATA.filter((b) => !b.banned).map((b) => b.name);
export const CAT_BREEDS = CAT_BREED_DATA.filter((b) => !b.banned).map((b) => b.name);

// ── Banned breed detection ────────────────────────────────────────────────────

type BannedWarning =
  | { kind: "banned_dog"; breedName: string; note: string }
  | { kind: "banned_cat_bengal" }
  | { kind: "banned_cat_savannah" };

const BANNED_DOG_PATTERNS: [RegExp, string][] = [
  [/pit\s*bull|pitbull/i, "Pit Bull Terrier"],
  [/japanese\s*tosa|\btosa\b/i, "Japanese Tosa"],
  [/dogo\s*argentino/i, "Dogo Argentino"],
  [/fila\s*brasileiro/i, "Fila Brasileiro"],
  [/presa\s*canario/i, "Perro de Presa Canario"],
  [/wolf\s*hybrid|wolfdog/i, "Wolf Hybrid"],
];

export function detectBannedBreed(
  petType: "dog" | "cat",
  value: string
): BannedWarning | null {
  if (!value.trim()) return null;
  if (petType === "dog") {
    for (const [pat, name] of BANNED_DOG_PATTERNS) {
      if (pat.test(value))
        return {
          kind: "banned_dog",
          breedName: name,
          note: `${name} is a restricted breed under Australian biosecurity law and cannot be imported. Contact DAFF at imports@agriculture.gov.au for advice.`,
        };
    }
    // Also catch selected entries from the data list
    const match = DOG_BREED_DATA.find(
      (b) => b.banned && b.name.toLowerCase() === value.trim().toLowerCase()
    );
    if (match)
      return {
        kind: "banned_dog",
        breedName: match.name,
        note: match.bannedNote ?? `${match.name} cannot be imported to Australia.`,
      };
  } else {
    if (/\bbengal\b/i.test(value)) return { kind: "banned_cat_bengal" };
    if (/\bsavannah\b/i.test(value)) return { kind: "banned_cat_savannah" };
  }
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ComboboxBreedProps {
  petType: "dog" | "cat";
  value: string;
  onChange: (breed: string) => void;
  id?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  /** When true, suppress all Australian import ban indicators (for outbound context). */
  hideBanWarnings?: boolean;
  /** When true, input is greyed out and non-interactive (e.g. no pet type selected yet). */
  disabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ComboboxBreed({
  petType,
  value,
  onChange,
  id,
  label,
  placeholder,
  required,
  hint,
  hideBanWarnings = false,
  disabled = false,
}: ComboboxBreedProps) {
  const uid = useId();
  const inputId = id ?? `combobox-breed-${uid}`;
  const listId = `${inputId}-list`;

  // Start with bundled data (zero latency), swap silently to DB data when ready
  const bundled = petType === "cat" ? CAT_BREED_DATA : DOG_BREED_DATA;
  const [breedData, setBreedData] = useState<BreedEntry[]>(bundled);

  // Normalise a CachedBreedEntry (from DB/localStorage) into a BreedEntry
  const fromCached = useCallback((entries: CachedBreedEntry[]): BreedEntry[] =>
    entries.map((e) => ({
      name: e.name,
      ...(e.banned ? { banned: true as const, bannedNote: e.banned_note ?? undefined } : {}),
    })), []);

  // On mount: check localStorage first, then fetch from API if stale
  useEffect(() => {
    const cached = getBreedsFromCache(petType);
    if (cached) {
      setBreedData(fromCached(cached));
      return;
    }
    // Cache miss or stale — fetch from API in background, no loading state
    refreshBreedsCache().then((envelope) => {
      if (!envelope) return; // API unreachable, keep bundled data
      const entries = petType === "cat" ? envelope.cat : envelope.dog;
      setBreedData(fromCached(entries));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petType]);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Tracks whether a list-item selection just happened, so blur doesn't clear it
  const justSelectedRef = useRef(false);

  // Filter breeds by query — list-only, no custom entries allowed
  const query = value.trim().toLowerCase();
  const filtered = query
    ? breedData.filter((b) => b.name.toLowerCase().includes(query))
    : breedData;

  const exactMatch = breedData.some((b) => b.name.toLowerCase() === query);

  type Option = { id: string; entry: BreedEntry };
  const options: Option[] = filtered.map((entry, i) => ({
    id: `${listId}-${i}`,
    entry,
  }));

  const bannedWarning = hideBanWarnings ? null : detectBannedBreed(petType, value);
  const isSelectedExact = breedData.some(
    (b) => !b.banned && b.name.toLowerCase() === query
  );

  function open() {
    if (disabled) return;
    setIsOpen(true);
    setActiveIndex(-1);
  }
  function close() {
    setIsOpen(false);
    setActiveIndex(-1);
  }
  function select(name: string) {
    justSelectedRef.current = true;
    onChange(name);
    close();
    inputRef.current?.focus();
  }

  // On blur: if the typed value doesn't exactly match a breed in the list, clear it.
  // Delayed so a mouse-click selection fires first and sets justSelectedRef.
  function handleBlur() {
    setTimeout(() => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }
      if (value.trim() && !exactMatch) {
        onChange("");
      }
      close();
    }, 150);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      open();
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
      e.preventDefault();
      select(options[activeIndex].entry!.name);
    } else if (e.key === "Escape" || e.key === "Tab") {
      close();
    }
  }

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      listRef.current
        .querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  const activeId = activeIndex >= 0 ? options[activeIndex]?.id : undefined;

  // Input border/bg state
  const inputBorderClass = disabled
    ? "border-card-border bg-gray-50 cursor-not-allowed opacity-60"
    : bannedWarning
    ? "border-red-400 bg-red-50"
    : isSelectedExact
    ? "border-brand-600 bg-brand-50"
    : "border-card-border bg-white hover:border-gray-400";

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-gray-700"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div ref={containerRef} style={{ position: "relative" }}>
        {/* ── Input ── */}
        <div className="relative">
          <input
            ref={inputRef}
            id={inputId}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-haspopup="listbox"
            aria-required={required}
            aria-invalid={!!bannedWarning}
            aria-disabled={disabled}
            disabled={disabled}
            value={value}
            placeholder={disabled ? "Select a pet type first" : placeholder}
            autoComplete="off"
            spellCheck={false}
            maxLength={100}
            onFocus={open}
            onBlur={handleBlur}
            onChange={(e) => {
              onChange(e.target.value);
              open();
            }}
            onKeyDown={handleKeyDown}
            style={{
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              fontWeight: value ? 600 : 400,
            }}
            className={[
              "w-full pl-4 py-3 rounded-xl border text-gray-900 text-sm placeholder-gray-400",
              value ? "pr-16" : "pr-10",
              "transition-colors duration-150 min-h-[48px]",
              "focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent",
              inputBorderClass,
            ].join(" ")}
          />
          {/* Clear button — shown when input has a value */}
          {value && (
            <button
              type="button"
              aria-label="Clear breed"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange("");
                inputRef.current?.focus();
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {/* Chevron */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: isOpen ? "#1B4F72" : "#9CA3AF" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              style={{
                transition: "transform 150ms",
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>

        {/* ── Dropdown ── */}
        {isOpen && options.length > 0 && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label ?? "Breed options"}
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 9999,
              maxHeight: 320,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch" as never,
              touchAction: "pan-y",
              // Brand-tinted dropdown background
              background: "#F2F8FC",
              border: "1.5px solid #AED6F1",
              borderRadius: 14,
              boxShadow:
                "0 8px 32px rgba(27,79,114,0.14), 0 2px 8px rgba(27,79,114,0.08)",
              margin: 0,
              padding: "6px 0",
              listStyle: "none",
            }}
          >
            {/* Result count hint */}
            {!query && (
              <li
                aria-hidden="true"
                style={{
                  padding: "6px 16px 4px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#7FB3D3",
                  borderBottom: "1px solid #D6EAF8",
                  marginBottom: 4,
                }}
              >
                {breedData.length} breeds — type to search
              </li>
            )}

            {/* No-results state */}
            {query && options.length === 0 && (
              <li
                aria-live="polite"
                style={{
                  padding: "14px 16px",
                  fontSize: 13,
                  color: "#6B7280",
                  textAlign: "center",
                }}
              >
                No breeds found — try a different spelling.
              </li>
            )}

            {options.map((opt, idx) => {
              const entry = opt.entry;
              const isActive = idx === activeIndex;
              const isSelected = value.toLowerCase() === entry.name.toLowerCase();
              const isBanned = !hideBanWarnings && !!entry.banned;

              // Colours
              let bg = "transparent";
              let nameColor = "#0E2D42"; // very dark navy for readability
              let fontWeight = 500;

              if (isActive) {
                bg = "#D6EAF8"; // brand-100
                nameColor = "#1B4F72";
              } else if (isSelected && !isBanned) {
                bg = "#EBF5FB"; // brand-50
                nameColor = "#1B4F72";
              } else if (isBanned) {
                nameColor = "#C0392B";
                if (isActive) bg = "#FDEDEC";
              }

              if (isSelected || isBanned) {
                fontWeight = 600;
              }

              return (
                <li
                  key={opt.id}
                  id={opt.id}
                  role="option"
                  aria-selected={isSelected}
                  data-idx={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(entry.name);
                  }}
                  onTouchStart={(e) => {
                    // Record touch start Y so we can distinguish tap from scroll
                    (e.currentTarget as HTMLLIElement).dataset.touchStartY =
                      String(e.touches[0].clientY);
                  }}
                  onTouchEnd={(e) => {
                    const startY = Number(
                      (e.currentTarget as HTMLLIElement).dataset.touchStartY ?? 0
                    );
                    const endY = e.changedTouches[0].clientY;
                    // Only treat as a tap if the finger moved <8px vertically
                    if (Math.abs(endY - startY) < 8) {
                      e.preventDefault();
                      select(entry.name);
                    }
                  }}
                  style={{
                    padding: "9px 14px",
                    minHeight: 44,
                    cursor: "pointer",
                    touchAction: "pan-y",
                    WebkitTapHighlightColor: "transparent",
                    background: bg,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  {/* Icon column */}
                  <span
                    style={{
                      flexShrink: 0,
                      width: 18,
                      marginTop: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isBanned ? (
                      // Prohibited icon for banned breeds
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 20 20"
                        fill="#C0392B"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : isSelected ? (
                      // Checkmark for selected
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 20 20"
                        fill="#1B4F72"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : null}
                  </span>

                  {/* Label column */}
                  <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight,
                        color: nameColor,
                        lineHeight: 1.3,
                      }}
                    >
                      {entry.name}
                    </span>
                    {isBanned && entry.bannedNote && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#E74C3C",
                          fontWeight: 400,
                          lineHeight: 1.3,
                        }}
                      >
                        {entry.bannedNote}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Hint */}
      {hint && !bannedWarning && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}

      {/* No-match warning — shown when user typed something not in the list */}
      {value.trim() && !exactMatch && !bannedWarning && !isOpen && (
        <p className="text-xs text-amber-600">
          No matching breed found — please select from the list.
        </p>
      )}

      {/* Selected allowed breed highlight — inbound only */}
      {isSelectedExact && !bannedWarning && !hideBanWarnings && (
        <p className="text-xs font-semibold" style={{ color: "#1B4F72" }}>
          ✓ {value} — allowed to enter Australia
        </p>
      )}

      {/* Banned breed warning banner */}
      {bannedWarning && (
        <div
          role="alert"
          style={{
            background: "#FDEDEC",
            border: "1px solid #E74C3C",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <p
            className="text-sm font-bold"
            style={{ color: "#922B21", marginBottom: 4 }}
          >
            {bannedWarning.kind === "banned_dog"
              ? "⚠️ This breed cannot enter Australia"
              : bannedWarning.kind === "banned_cat_bengal"
              ? "⚠️ Bengal cats banned from March 2026"
              : "⚠️ Savannah cats cannot enter Australia"}
          </p>
          <p className="text-sm" style={{ color: "#922B21" }}>
            {bannedWarning.kind === "banned_dog"
              ? bannedWarning.note
              : bannedWarning.kind === "banned_cat_bengal"
              ? "Bengal cats are no longer permitted to enter Australia as of March 2026. Please contact DAFF at imports@agriculture.gov.au for advice."
              : "Savannah cats are a hybrid species and are not permitted to enter Australia. Please contact DAFF at imports@agriculture.gov.au for advice."}
          </p>
        </div>
      )}
    </div>
  );
}
