export interface LngLat {
  lng: number;
  lat: number;
}

const EARTH_NM = 3440.065;

export function distanceNm(a: LngLat, b: LngLat): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_NM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function bearingDeg(a: LngLat, b: LngLat): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function polylineLength(points: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceNm(points[i - 1], points[i]);
  return total;
}

export function pointAtDistance(points: LngLat[], distance: number): LngLat {
  if (points.length === 0) return { lng: 0, lat: 0 };
  if (distance <= 0) return points[0];
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = distanceNm(points[i - 1], points[i]);
    if (walked + seg >= distance) {
      const t = seg === 0 ? 0 : (distance - walked) / seg;
      return {
        lng: points[i - 1].lng + (points[i].lng - points[i - 1].lng) * t,
        lat: points[i - 1].lat + (points[i].lat - points[i - 1].lat) * t,
      };
    }
    walked += seg;
  }
  return points[points.length - 1];
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
