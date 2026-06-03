export const formatCurrency = (n: number): string => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return (
    sign +
    "₹" +
    abs.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
  );
};

export const formatCurrencyCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return formatCurrency(n);
};

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateShort = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const monthsBetween = (fromISO: string, toISO: string): number => {
  const a = new Date(fromISO);
  const b = new Date(toISO);
  const years = b.getFullYear() - a.getFullYear();
  const months = b.getMonth() - a.getMonth();
  const dayDelta = b.getDate() - a.getDate();
  let total = years * 12 + months;
  if (dayDelta < 0) total -= 1;
  // ensure non-negative
  return Math.max(0, total);
};

export const uid = (): string => {
  // short unique id
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
};

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
