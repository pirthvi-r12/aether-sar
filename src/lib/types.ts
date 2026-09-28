export type OrbState = "idle" | "correlating" | "locked";

export type VesselType = "crude_tanker" | "cargo" | "fishing" | "reefer";

export type VesselStatus = "active_ais" | "dark_suspect" | "confirmed_illicit" | "spoofing";

export type IncidentCategory =
  | "sts_transfer"
  | "sanctions_evasion"
  | "iuu_fishing"
  | "transponder_spoof";

export type Severity = "critical" | "high" | "medium";

export type QueueFilter = "all" | "dark_tankers" | "sts_transfer" | "sanctions_evasion";

export interface TrackSample {
  hoursAgo: number;
  lat: number;
  lng: number;
}

export interface RadarHit {
  hoursAgo: number;
  lat: number;
  lng: number;
  backscatter: number;
  confidence: number;
  length: number;
  beam: number;
  anomalyId: string;
}

export interface SimVessel {
  id: string;
  name: string;
  imo: string | null;
  mmsi: string | null;
  flag: string;
  type: VesselType;
  length: number;
  beam: number;
  draft: number;
  displacement: number;
  status: VesselStatus;
  speed: number;
  track: TrackSample[];
  aisDarkHoursAgo?: number;
  radar?: RadarHit;
  spoof?: { lat: number; lng: number; radiusLat: number; radiusLng: number };
}

export interface TrafficVessel {
  id: string;
  name: string;
  mmsi: string;
  flag: string;
  type: VesselType;
  length: number;
  beam: number;
  speed: number;
  lane: number;
  offsetNm: number;
  direction: 1 | -1;
}

export interface TimelineEvent {
  hoursAgo: number;
  label: string;
}

export interface Incident {
  id: string;
  caseName: string;
  title: string;
  category: IncidentCategory;
  darkTanker: boolean;
  severity: Severity;
  vesselId: string;
  relatedVesselIds: string[];
  summary: string;
  intelligence: string;
  confidence: number;
  confidenceLabel: string;
  region: { lng: number; lat: number; scale: number };
  timeline: TimelineEvent[];
  anomalyId: string;
  reserve?: { lng: number; lat: number; rLng: number; rLat: number; name: string };
  swath?: [number, number][];
  swathHoursAgo?: number;
}

export interface Lane {
  id: string;
  points: { lng: number; lat: number }[];
  lengthNm: number;
}

export interface HexCell {
  lng: number;
  lat: number;
  weight: number;
}

export interface MapView {
  lng: number;
  lat: number;
  scale: number;
}
