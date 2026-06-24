const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£", USD: "$", EUR: "€", CAD: "C$", AUD: "A$",
  CHF: "Fr", SEK: "kr", NOK: "kr", DKK: "kr", JPY: "¥",
  INR: "₹", SGD: "S$", BRL: "R$", MXN: "$",
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

// Checked in order: multi-char symbols first to avoid partial matches
const DETECT_ORDER = ["C$", "A$", "S$", "R$", "Fr", "kr", "£", "€", "¥", "₹", "$"];

function detectCurrencySymbol(raw: string): string | null {
  for (const s of DETECT_ORDER) {
    if (raw.includes(s)) return s;
  }
  return null;
}

function stripSymbols(s: string): string {
  for (const sym of DETECT_ORDER) {
    s = s.split(sym).join("");
  }
  return s.trim();
}

function formatNum(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${parseFloat(k.toFixed(1))}k`;
  }
  return String(Math.round(n));
}

export function formatSalary(raw: string | null | undefined, defaultCurrency: string): string {
  if (!raw) return "";
  if (!/\d/.test(raw)) return raw;

  const detected = detectCurrencySymbol(raw);
  const symbol = detected ?? defaultCurrency;
  const stripped = stripSymbols(raw);

  // Range: two numeric groups separated by hyphen/en-dash/em-dash
  const rangeMatch = stripped.match(/^\s*([\d,.]+)\s*[-–—]\s*([\d,.]+)\s*$/);
  if (rangeMatch) {
    const n1 = parseFloat(rangeMatch[1].replace(/,/g, ""));
    const n2 = parseFloat(rangeMatch[2].replace(/,/g, ""));
    if (!isNaN(n1) && !isNaN(n2)) {
      return `${symbol}${formatNum(n1)} – ${formatNum(n2)}`;
    }
  }

  // Single numeric value
  const singleMatch = stripped.match(/^\s*([\d,.]+)\s*$/);
  if (singleMatch) {
    const n = parseFloat(singleMatch[1].replace(/,/g, ""));
    if (!isNaN(n)) return `${symbol}${formatNum(n)}`;
  }

  return raw;
}
