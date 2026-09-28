import { mulberry32, pointAtDistance, polylineLength } from "@/lib/nav";
import type { HexCell, Incident, Lane, SimVessel, TrafficVessel } from "@/lib/types";

const rawLanes: { id: string; points: { lng: number; lat: number }[] }[] = [
  {
    id: "hormuz",
    points: [
      { lng: 48.2, lat: 28.8 },
      { lng: 50.2, lat: 27.6 },
      { lng: 52.4, lat: 26.6 },
      { lng: 54.6, lat: 26.2 },
      { lng: 56.4, lat: 26.6 },
      { lng: 57.4, lat: 25.6 },
      { lng: 58.6, lat: 24.5 },
      { lng: 60.2, lat: 24.1 },
      { lng: 62.4, lat: 23.2 },
    ],
  },
  {
    id: "malacca",
    points: [
      { lng: 98.4, lat: 4.2 },
      { lng: 100.2, lat: 2.6 },
      { lng: 102.2, lat: 1.8 },
      { lng: 103.8, lat: 1.2 },
      { lng: 105.4, lat: 1.6 },
      { lng: 107.6, lat: 3.2 },
      { lng: 109.4, lat: 5.4 },
    ],
  },
  {
    id: "south-china-sea",
    points: [
      { lng: 109.2, lat: 8.2 },
      { lng: 111.4, lat: 12.0 },
      { lng: 113.6, lat: 15.4 },
      { lng: 116.2, lat: 19.2 },
      { lng: 119.4, lat: 22.4 },
      { lng: 121.8, lat: 24.8 },
    ],
  },
  {
    id: "med",
    points: [
      { lng: 32.4, lat: 31.4 },
      { lng: 30.2, lat: 32.6 },
      { lng: 26.4, lat: 33.8 },
      { lng: 22.2, lat: 35.4 },
      { lng: 16.4, lat: 36.2 },
      { lng: 10.2, lat: 37.4 },
      { lng: 4.2, lat: 37.8 },
      { lng: -2.4, lat: 36.4 },
      { lng: -8.6, lat: 35.8 },
    ],
  },
  {
    id: "atlantic",
    points: [
      { lng: -9.8, lat: 48.2 },
      { lng: -22.0, lat: 46.4 },
      { lng: -38.0, lat: 42.6 },
      { lng: -52.0, lat: 41.2 },
      { lng: -70.0, lat: 40.2 },
    ],
  },
  {
    id: "baltic",
    points: [
      { lng: 10.6, lat: 54.6 },
      { lng: 13.2, lat: 55.4 },
      { lng: 16.4, lat: 56.2 },
      { lng: 19.2, lat: 57.6 },
      { lng: 22.4, lat: 59.0 },
      { lng: 24.6, lat: 59.6 },
    ],
  },
  {
    id: "west-africa",
    points: [
      { lng: 8.4, lat: 4.0 },
      { lng: 5.2, lat: 3.6 },
      { lng: 2.4, lat: 5.2 },
      { lng: -1.6, lat: 5.4 },
      { lng: -6.2, lat: 4.2 },
    ],
  },
  {
    id: "cape",
    points: [
      { lng: 18.6, lat: -34.4 },
      { lng: 28.0, lat: -34.2 },
      { lng: 38.0, lat: -26.0 },
      { lng: 46.0, lat: -16.0 },
      { lng: 52.0, lat: -6.0 },
      { lng: 56.0, lat: 4.0 },
    ],
  },
  {
    id: "pacific-west",
    points: [
      { lng: 122.0, lat: 28.0 },
      { lng: 136.0, lat: 33.0 },
      { lng: 148.0, lat: 38.0 },
      { lng: 162.0, lat: 42.0 },
      { lng: 176.0, lat: 46.0 },
    ],
  },
  {
    id: "pacific-east",
    points: [
      { lng: -176.0, lat: 48.0 },
      { lng: -158.0, lat: 48.0 },
      { lng: -140.0, lat: 46.0 },
      { lng: -126.0, lat: 40.0 },
    ],
  },
];

export const LANES: Lane[] = rawLanes.map((lane) => ({
  ...lane,
  lengthNm: polylineLength(lane.points),
}));

function buildHexes(): HexCell[] {
  const size = 2.6;
  const bins = new Map<string, { lng: number; lat: number; w: number }>();
  for (const lane of LANES) {
    const steps = Math.max(10, Math.round(lane.lengthNm / 55));
    for (let i = 0; i <= steps; i++) {
      const point = pointAtDistance(lane.points, lane.lengthNm * (i / steps));
      const lng = point.lng + (((i * 17) % 5) - 2) * 0.18;
      const lat = point.lat + ((i % 3) - 1) * 0.22;
      const q = Math.round(lng / size);
      const r = Math.round(lat / size);
      const key = `${q}:${r}`;
      const current = bins.get(key);
      if (current) current.w += 1;
      else bins.set(key, { lng: q * size, lat: r * size, w: 1 });
    }
  }
  const max = Math.max(...[...bins.values()].map((bin) => bin.w));
  return [...bins.values()].map((bin) => ({ lng: bin.lng, lat: bin.lat, weight: bin.w / max }));
}

export const HEXES: HexCell[] = buildHexes();

const FLAGS = ["Liberia", "Marshall Islands", "Panama", "Singapore", "Malta", "Hong Kong", "Greece", "China"];
const NAMES = ["AEGEAN CURRENT", "HARBOR LIGHT", "SILK MERIDIAN", "NORTH REEF", "AMBER WAKE", "CEDAR TIDE", "LOTUS REACH", "IRON MONSOON", "QUIET HORIZON", "SAFFRON KEEL"];

function buildTraffic(): TrafficVessel[] {
  const rand = mulberry32(0xa37e52);
  const vessels: TrafficVessel[] = [];
  LANES.forEach((lane, laneIndex) => {
    const count = lane.id === "hormuz" || lane.id === "malacca" || lane.id === "south-china-sea" ? 9 : 6;
    for (let i = 0; i < count; i++) {
      const n = vessels.length;
      vessels.push({
        id: `traffic-${n}`,
        name: `${NAMES[n % NAMES.length]} ${10 + (n % 80)}`,
        mmsi: String(200000000 + n * 137),
        flag: FLAGS[n % FLAGS.length],
        type: n % 11 === 0 ? "reefer" : n % 4 === 0 ? "cargo" : "crude_tanker",
        length: 160 + Math.floor(rand() * 140),
        beam: 24 + Math.floor(rand() * 22),
        speed: 10 + rand() * 6,
        lane: laneIndex,
        offsetNm: rand() * lane.lengthNm,
        direction: rand() > 0.45 ? 1 : -1,
      });
    }
  });
  return vessels;
}

export const TRAFFIC: TrafficVessel[] = buildTraffic();

export const VESSELS: SimVessel[] = [
  {
    id: "orion",
    name: "ORION STAR",
    imo: "9384412",
    mmsi: "357891004",
    flag: "Panama",
    type: "crude_tanker",
    length: 274,
    beam: 48,
    draft: 16.2,
    displacement: 158000,
    status: "confirmed_illicit",
    speed: 12.4,
    aisDarkHoursAgo: 14,
    track: [
      { hoursAgo: 72, lat: 25.05, lng: 56.35 },
      { hoursAgo: 36, lat: 25.18, lng: 56.55 },
      { hoursAgo: 20, lat: 25.55, lng: 56.85 },
      { hoursAgo: 14, lat: 24.85, lng: 57.55 },
      { hoursAgo: 8, lat: 24.42, lng: 58.15 },
      { hoursAgo: 6, lat: 24.28, lng: 58.47 },
      { hoursAgo: 0, lat: 24.55, lng: 59.1 },
    ],
    radar: {
      hoursAgo: 6,
      lat: 24.28,
      lng: 58.47,
      backscatter: 13.1,
      confidence: 94.2,
      length: 274,
      beam: 48,
      anomalyId: "8492",
    },
  },
  {
    id: "kh-04",
    name: "UNFLAGGED HULL KH-04",
    imo: null,
    mmsi: null,
    flag: "Unknown",
    type: "crude_tanker",
    length: 280,
    beam: 50,
    draft: 17.4,
    displacement: 172000,
    status: "confirmed_illicit",
    speed: 11.1,
    aisDarkHoursAgo: 72,
    track: [
      { hoursAgo: 72, lat: 23.15, lng: 61.4 },
      { hoursAgo: 24, lat: 23.7, lng: 59.8 },
      { hoursAgo: 10, lat: 24.05, lng: 58.95 },
      { hoursAgo: 6, lat: 24.3, lng: 58.5167 },
      { hoursAgo: 0, lat: 23.9, lng: 58.0 },
    ],
    radar: {
      hoursAgo: 6,
      lat: 24.3,
      lng: 58.5167,
      backscatter: 14.8,
      confidence: 96.8,
      length: 280,
      beam: 49,
      anomalyId: "8491",
    },
  },
  {
    id: "volga",
    name: "VOLGA-7",
    imo: "9412208",
    mmsi: "273456110",
    flag: "Cameroon",
    type: "cargo",
    length: 189,
    beam: 32,
    draft: 11.4,
    displacement: 28400,
    status: "spoofing",
    speed: 8.6,
    track: [
      { hoursAgo: 72, lat: 59.35, lng: 21.55 },
      { hoursAgo: 24, lat: 59.22, lng: 21.9 },
      { hoursAgo: 5, lat: 59.1, lng: 22.15 },
      { hoursAgo: 0, lat: 59.06, lng: 22.33 },
    ],
    spoof: { lat: 59.413, lng: 24.832, radiusLat: 0.045, radiusLng: 0.08 },
    radar: {
      hoursAgo: 5,
      lat: 59.1,
      lng: 22.15,
      backscatter: 11.4,
      confidence: 91.5,
      length: 188,
      beam: 32,
      anomalyId: "8504",
    },
  },
  {
    id: "lynx",
    name: "PACIFIC LYNX",
    imo: "9367781",
    mmsi: "352001192",
    flag: "Panama",
    type: "crude_tanker",
    length: 244,
    beam: 42,
    draft: 14.1,
    displacement: 112000,
    status: "dark_suspect",
    speed: 14.2,
    aisDarkHoursAgo: 4.2,
    track: [
      { hoursAgo: 48, lat: 24.8, lng: 57.9 },
      { hoursAgo: 12, lat: 23.4, lng: 59.6 },
      { hoursAgo: 4.2, lat: 22.7, lng: 60.35 },
      { hoursAgo: 0, lat: 22.15, lng: 61.05 },
    ],
  },
  {
    id: "veil",
    name: "NORDIC VEIL",
    imo: "9521004",
    mmsi: "613445210",
    flag: "Cameroon",
    type: "crude_tanker",
    length: 250,
    beam: 44,
    draft: 15.0,
    displacement: 121000,
    status: "dark_suspect",
    speed: 10.8,
    aisDarkHoursAgo: 9,
    track: [
      { hoursAgo: 48, lat: 37.4, lng: 20.2 },
      { hoursAgo: 16, lat: 36.7, lng: 22.1 },
      { hoursAgo: 9, lat: 36.35, lng: 22.7 },
      { hoursAgo: 0, lat: 36.05, lng: 23.35 },
    ],
    radar: {
      hoursAgo: 3,
      lat: 36.12,
      lng: 23.15,
      backscatter: 10.6,
      confidence: 86.4,
      length: 248,
      beam: 44,
      anomalyId: "8544",
    },
  },
  {
    id: "malacca",
    name: "MALACCA GHOST",
    imo: "9401126",
    mmsi: "563882190",
    flag: "Singapore",
    type: "crude_tanker",
    length: 228,
    beam: 40,
    draft: 13.6,
    displacement: 98000,
    status: "dark_suspect",
    speed: 11.5,
    aisDarkHoursAgo: 7,
    track: [
      { hoursAgo: 36, lat: 3.4, lng: 100.2 },
      { hoursAgo: 12, lat: 2.4, lng: 101.5 },
      { hoursAgo: 7, lat: 2.15, lng: 102.15 },
      { hoursAgo: 0, lat: 1.85, lng: 103.05 },
    ],
    radar: {
      hoursAgo: 4,
      lat: 2.0,
      lng: 102.55,
      backscatter: 12.2,
      confidence: 89.1,
      length: 226,
      beam: 39,
      anomalyId: "8550",
    },
  },
  {
    id: "scs",
    name: "SCS RENDEZVOUS",
    imo: "9453301",
    mmsi: "477882331",
    flag: "Hong Kong",
    type: "crude_tanker",
    length: 263,
    beam: 46,
    draft: 15.8,
    displacement: 140000,
    status: "confirmed_illicit",
    speed: 9.4,
    aisDarkHoursAgo: 11,
    track: [
      { hoursAgo: 40, lat: 18.4, lng: 112.2 },
      { hoursAgo: 16, lat: 16.1, lng: 113.6 },
      { hoursAgo: 8, lat: 14.6, lng: 114.4 },
      { hoursAgo: 0, lat: 13.7, lng: 115.1 },
    ],
    radar: {
      hoursAgo: 8,
      lat: 14.18,
      lng: 114.76,
      backscatter: 12.7,
      confidence: 90.1,
      length: 260,
      beam: 45,
      anomalyId: "8522",
    },
  },
];

const TRAWLER_OFFSETS: { id: string; name: string; lat: number; lng: number; dark?: number }[] = [
  { id: "trawl-1", name: "TRAWLER MPA-1", lat: -3.55, lng: -172.35 },
  { id: "trawl-2", name: "TRAWLER MPA-2", lat: -3.72, lng: -171.85, dark: 18 },
  { id: "trawl-3", name: "TRAWLER MPA-3", lat: -3.95, lng: -172.15, dark: 18 },
  { id: "trawl-4", name: "TRAWLER MPA-4", lat: -4.05, lng: -171.7 },
  { id: "trawl-5", name: "TRAWLER MPA-5", lat: -3.68, lng: -172.45, dark: 12 },
  { id: "trawl-6", name: "TRAWLER MPA-6", lat: -3.88, lng: -172.55 },
];

export const TRAWLERS: SimVessel[] = TRAWLER_OFFSETS.map((boat, index) => ({
  id: boat.id,
  name: boat.name,
  imo: null,
  mmsi: boat.dark ? null : String(412770000 + index),
  flag: "Unknown",
  type: "fishing" as const,
  length: 42 + index * 3,
  beam: 9,
  draft: 4.2,
  displacement: 680,
  status: boat.dark ? "confirmed_illicit" : "dark_suspect",
  speed: 3.2,
  aisDarkHoursAgo: boat.dark,
  track: [
    { hoursAgo: 48, lat: boat.lat + 0.18, lng: boat.lng - 0.22 },
    { hoursAgo: 12, lat: boat.lat + 0.04, lng: boat.lng - 0.04 },
    { hoursAgo: 0, lat: boat.lat, lng: boat.lng },
  ],
  radar: boat.dark
    ? {
        hoursAgo: 11,
        lat: boat.lat,
        lng: boat.lng,
        backscatter: 8.6,
        confidence: 88.4,
        length: 48,
        beam: 10,
        anomalyId: "8510",
      }
    : undefined,
}));

export const ALL_TRACKED: SimVessel[] = [...VESSELS, ...TRAWLERS];

export const INCIDENTS: Incident[] = [
  {
    id: "alpha",
    caseName: "CASE ALPHA",
    title: "Vessel ORION STAR (Flag: Panama)",
    category: "sts_transfer",
    darkTanker: true,
    severity: "critical",
    vesselId: "orion",
    relatedVesselIds: ["kh-04"],
    summary: "Transponder killed 14 hours ago in Persian Gulf. Radar detected side-by-side with unflagged supertanker.",
    intelligence:
      "ORION STAR killed its AIS east of the Strait of Hormuz. Six hours later a Sentinel-1 C-band pass imaged a 280 m unflagged hull alongside it in the Gulf of Oman at 24°18'N 58°31'E. Separation 0.4 nm. Radar return 14.8 dB. Length and kinematic profile match the Panama-flagged tanker at 96.8%.",
    confidence: 96.8,
    confidenceLabel: "96.8% MATCH (Kinematic & Length Profile)",
    region: { lng: 58.45, lat: 24.35, scale: 5200 },
    anomalyId: "8491",
    swathHoursAgo: 6,
    swath: [
      [57.7, 25.15],
      [59.55, 25.05],
      [59.7, 23.55],
      [57.85, 23.65],
    ],
    timeline: [
      { hoursAgo: 36, label: "Departed Fujairah anchorage. AIS normal, 12.4 kn." },
      { hoursAgo: 18, label: "Transited Strait of Hormuz eastbound." },
      { hoursAgo: 14, label: "AIS ceased. Last ping 24°51'N 57°33'E." },
      { hoursAgo: 6, label: "Sentinel-1B C-band pass. Dual hull return, 14.8 dB, anomaly #8491." },
      { hoursAgo: 0, label: "Dead reckoning holds both hulls in the Gulf of Oman corridor." },
    ],
  },
  {
    id: "bravo",
    caseName: "CASE BRAVO",
    title: "Ghost Cargo VOLGA-7",
    category: "transponder_spoof",
    darkTanker: false,
    severity: "critical",
    vesselId: "volga",
    relatedVesselIds: [],
    summary: "GPS spoofing detected (broadcasting location in airport while radar places it 80 nautical miles offshore).",
    intelligence:
      "VOLGA-7 broadcasts a closed circular AIS track centered on Tallinn Airport. Capella-2 X-band imagery places a 188 m metal hull in the Baltic, 80 nautical miles west of the spoofed coordinate. The ashore track never leaves the airport loop.",
    confidence: 91.5,
    confidenceLabel: "91.5% MATCH (Radar length vs registry)",
    region: { lng: 23.55, lat: 59.28, scale: 4200 },
    anomalyId: "8504",
    swathHoursAgo: 5,
    swath: [
      [21.5, 59.7],
      [23.15, 59.75],
      [23.05, 58.55],
      [21.4, 58.5],
    ],
    timeline: [
      { hoursAgo: 20, label: "AIS collapses into a loop over Tallinn Airport." },
      { hoursAgo: 5, label: "Capella-2 X-band detects the hull offshore. Anomaly #8504." },
      { hoursAgo: 0, label: "False AIS track still broadcasting ashore." },
    ],
  },
  {
    id: "charlie",
    caseName: "CASE CHARLIE",
    title: "Deep Ocean IUU Fleet",
    category: "iuu_fishing",
    darkTanker: false,
    severity: "high",
    vesselId: "trawl-2",
    relatedVesselIds: ["trawl-1", "trawl-3", "trawl-4", "trawl-5", "trawl-6"],
    summary: "6 unauthorized trawlers clustered inside Marine Protected Reserve boundary.",
    intelligence:
      "Six fishing hulls are holding station inside the Phoenix Islands Protected Area. Three have no AIS. Umbra-04 imaged the cluster 11 hours ago. No licensed effort is filed for this box.",
    confidence: 88.4,
    confidenceLabel: "88.4% MATCH (Cluster geometry)",
    region: { lng: -172.05, lat: -3.78, scale: 3600 },
    anomalyId: "8510",
    reserve: { lng: -172.05, lat: -3.8, rLng: 0.95, rLat: 0.72, name: "PHOENIX ISLANDS MPA" },
    swathHoursAgo: 11,
    swath: [
      [-173.15, -3.05],
      [-171.05, -3.0],
      [-171.15, -4.55],
      [-173.25, -4.6],
    ],
    timeline: [
      { hoursAgo: 30, label: "Six trawlers cross the reserve boundary." },
      { hoursAgo: 11, label: "Umbra-04 X-band images the cluster. Anomaly #8510." },
      { hoursAgo: 0, label: "Three hulls remain dark inside the boundary." },
    ],
  },
  {
    id: "delta",
    caseName: "CASE DELTA",
    title: "Tanker NORDIC VEIL (Flag: Cameroon)",
    category: "sanctions_evasion",
    darkTanker: true,
    severity: "high",
    vesselId: "veil",
    relatedVesselIds: [],
    summary: "Flag hopped to Cameroon 19 days ago. AIS dark through a historic ship-to-ship box south of the Peloponnese.",
    intelligence:
      "NORDIC VEIL dropped AIS nine hours ago on approach to a known STS box. Ownership chain terminates at a Cameroon shelf company. Draft and length are consistent with a laden Aframax.",
    confidence: 86.4,
    confidenceLabel: "86.4% MATCH (Registry & kinematics)",
    region: { lng: 22.9, lat: 36.25, scale: 4800 },
    anomalyId: "8544",
    timeline: [
      { hoursAgo: 16, label: "Southbound in the Ionian, AIS normal." },
      { hoursAgo: 9, label: "Transponder ceases at the edge of an STS box." },
      { hoursAgo: 3, label: "SAR length return consistent with the registry entry." },
      { hoursAgo: 0, label: "Dead-reckoning cone still inside the box." },
    ],
  },
  {
    id: "echo",
    caseName: "CASE ECHO",
    title: "MALACCA GHOST product tanker",
    category: "sts_transfer",
    darkTanker: true,
    severity: "high",
    vesselId: "malacca",
    relatedVesselIds: [],
    summary: "AIS dark for 7 hours inside the Malacca traffic separation scheme. SAR length disagrees with the last AIS static report.",
    intelligence:
      "A 226 m return sits 0.8 nm off the last AIS dead-reckoning spine. Static AIS had reported 189 m. The mismatch is the spoof signature.",
    confidence: 89.1,
    confidenceLabel: "89.1% MATCH (Length disagreement)",
    region: { lng: 102.4, lat: 2.15, scale: 5000 },
    anomalyId: "8550",
    timeline: [
      { hoursAgo: 18, label: "Entered the Strait of Malacca eastbound." },
      { hoursAgo: 7, label: "AIS static report freezes, then drops." },
      { hoursAgo: 4, label: "SAR hull is 37 m longer than the AIS claim." },
    ],
  },
  {
    id: "foxtrot",
    caseName: "CASE FOXTROT",
    title: "SCS RENDEZVOUS dark contact",
    category: "sanctions_evasion",
    darkTanker: true,
    severity: "critical",
    vesselId: "scs",
    relatedVesselIds: [],
    summary: "Hong Kong-flagged tanker went dark before a South China Sea rendezvous box. ICEYE pass confirms a 260 m hull.",
    intelligence:
      "SCS RENDEZVOUS killed AIS 11 hours ago. The ICEYE X-band swath locks a hull on the predicted dead-reckoning vector. Cargo history overlaps a sanctioned loading window.",
    confidence: 90.1,
    confidenceLabel: "90.1% MATCH (Kinematic vector)",
    region: { lng: 114.5, lat: 14.6, scale: 2800 },
    anomalyId: "8522",
    swathHoursAgo: 8,
    swath: [
      [113.2, 15.5],
      [115.9, 15.65],
      [115.7, 13.3],
      [113.0, 13.15],
    ],
    timeline: [
      { hoursAgo: 20, label: "Southbound from the Taiwan Strait, AIS normal." },
      { hoursAgo: 11, label: "Transponder ceases on approach to the rendezvous box." },
      { hoursAgo: 8, label: "ICEYE X-band confirms the hull. Anomaly #8522." },
    ],
  },
];

export function incidentById(id: string): Incident | undefined {
  return INCIDENTS.find((incident) => incident.id === id);
}

export function vesselById(id: string): SimVessel | undefined {
  return ALL_TRACKED.find((vessel) => vessel.id === id);
}

export function incidentForVessel(id: string): Incident | undefined {
  return INCIDENTS.find((incident) => incident.vesselId === id || incident.relatedVesselIds.includes(id));
}

export const TICKER = [
  "[SAR PASS: SENTINEL-1B] FOOTPRINT: GULF OF OMAN // ANOMALY #8491 LOCKED",
  "[MMSI 352001192] AIS DROPPED 4h 12m AGO // DEAD-RECKONING VECTOR: 14.2 KNOTS HEADING 142°",
  "[RADAR DETECT] 280M VESSEL DETECTED AT UNREPORTED COORDINATES 24°18'N 58°31'E",
  "[CAPELLA-2 X-BAND] BALTIC SWATH CLOSED // SPOOF LOOP VS HULL Δ 80 NM",
  "[ICEYE] SOUTH CHINA SEA PASS // 260M RETURN UNMATCHED TO AIS",
  "[UMBRA-04] PHOENIX ISLANDS MPA // 6 TRAWLER CLUSTER INSIDE RESERVE",
  "[AIS INGEST] 4,820 PINGS/SEC // 18 SATELLITES ON STATION",
  "[DEAD RECKONING] ORION STAR DARK 14h // CONE 12.4 KN HEADING 104°",
];

export const TELEMETRY = {
  satellites: 18,
  vessels: 142890,
  blips: 14,
  pings: 4820,
};
