import type { SimVessel, TrackSample, TrafficVessel } from "@/lib/types";
import { bearingDeg, pointAtDistance } from "@/lib/nav";
import { LANES } from "@/lib/data";

export function sampleTrack(track: TrackSample[], hoursAgo: number): TrackSample {
  const points = [...track].sort((a, b) => b.hoursAgo - a.hoursAgo);
  if (hoursAgo >= points[0].hoursAgo) return points[0];
  const last = points[points.length - 1];
  if (hoursAgo <= last.hoursAgo) return last;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (hoursAgo <= a.hoursAgo && hoursAgo >= b.hoursAgo) {
      const span = a.hoursAgo - b.hoursAgo;
      const t = span === 0 ? 0 : (a.hoursAgo - hoursAgo) / span;
      return {
        hoursAgo,
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      };
    }
  }
  return last;
}

export function trackHeading(track: TrackSample[], hoursAgo: number): number {
  const past = sampleTrack(track, Math.min(72, hoursAgo + 0.35));
  const future = sampleTrack(track, Math.max(0, hoursAgo - 0.35));
  if (past.lat === future.lat && past.lng === future.lng) return 0;
  return bearingDeg(past, future);
}

export function aisLive(vessel: SimVessel, hoursAgo: number): boolean {
  if (vessel.spoof) return true;
  if (vessel.aisDarkHoursAgo == null) return true;
  return hoursAgo > vessel.aisDarkHoursAgo;
}

export function radarLive(vessel: SimVessel, hoursAgo: number): boolean {
  return Boolean(vessel.radar) && hoursAgo <= vessel.radar!.hoursAgo;
}

export function spoofPoint(vessel: SimVessel, hoursAgo: number): { lat: number; lng: number } {
  const spoof = vessel.spoof!;
  const angle = hoursAgo * 0.85;
  return {
    lat: spoof.lat + Math.sin(angle) * spoof.radiusLat,
    lng: spoof.lng + Math.cos(angle) * spoof.radiusLng,
  };
}

export function trafficPose(vessel: TrafficVessel, hoursAgo: number): { lat: number; lng: number; heading: number } {
  const lane = LANES[vessel.lane];
  const length = lane.lengthNm || 1;
  let distance = (vessel.offsetNm + vessel.speed * (72 - hoursAgo) * vessel.direction) % length;
  if (distance < 0) distance += length;
  const pos = pointAtDistance(lane.points, distance);
  const ahead = pointAtDistance(lane.points, (distance + 12) % length);
  const heading = vessel.direction === 1 ? bearingDeg(pos, ahead) : bearingDeg(ahead, pos);
  return { ...pos, heading };
}
