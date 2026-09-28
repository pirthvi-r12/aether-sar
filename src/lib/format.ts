export function formatCoord(lat: number, lng: number): string {
  const fmt = (value: number) => {
    const abs = Math.abs(value);
    const degrees = Math.floor(abs);
    const minutes = Math.round((abs - degrees) * 60);
    const d = minutes === 60 ? degrees + 1 : degrees;
    const m = minutes === 60 ? 0 : minutes;
    return `${d}°${String(m).padStart(2, "0")}'`;
  };
  return `${fmt(lat)}${lat >= 0 ? "N" : "S"} ${fmt(lng)}${lng >= 0 ? "E" : "W"}`;
}

export function formatHours(hoursAgo: number): string {
  if (hoursAgo < 0.05) return "LIVE";
  const total = Math.round(hoursAgo * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `T-${m}m`;
  if (m === 0) return `T-${h}h`;
  return `T-${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
