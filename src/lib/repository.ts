import { INCIDENTS, TELEMETRY, VESSELS } from "@/lib/data";
import { databaseDriver, dbQuery, mysqlSettings } from "@/lib/db";

export async function readVessels() {
  const simulated = VESSELS.map((vessel) => ({
    id: vessel.id,
    name: vessel.name,
    imo: vessel.imo,
    mmsi: vessel.mmsi,
    flag_country: vessel.flag,
    vessel_type: vessel.type,
    length_meters: vessel.length,
    beam_meters: vessel.beam,
    last_reported_lat: vessel.track[vessel.track.length - 1]?.lat ?? null,
    last_reported_lng: vessel.track[vessel.track.length - 1]?.lng ?? null,
    status: vessel.status,
  }));

  if (!databaseDriver()) return { source: "simulation" as const, vessels: simulated };

  try {
    const rows = await dbQuery(
      "SELECT id, name, imo, mmsi, flag_country, vessel_type, length_meters, beam_meters, last_reported_lat, last_reported_lng, status FROM vessels ORDER BY id"
    );
    if (!rows.length) return { source: "simulation" as const, vessels: simulated };
    return { source: "database" as const, vessels: rows };
  } catch {
    return { source: "simulation" as const, vessels: simulated, warning: "database unavailable" };
  }
}

export async function readIncidents() {
  const simulated = INCIDENTS.map((incident) => ({
    id: incident.id,
    title: incident.title,
    incident_type: incident.category,
    severity: incident.severity,
    timeline_json: incident.timeline,
    intelligence_summary: incident.intelligence,
    anomaly_id: incident.anomalyId,
  }));

  if (!databaseDriver()) return { source: "simulation" as const, incidents: simulated };

  try {
    const rows = await dbQuery(
      "SELECT id, title, incident_type, vessel_id, anomaly_id, severity, timeline_json, intelligence_summary, created_at FROM incidents ORDER BY id"
    );
    if (!rows.length) return { source: "simulation" as const, incidents: simulated };
    return { source: "database" as const, incidents: rows };
  } catch {
    return { source: "simulation" as const, incidents: simulated, warning: "database unavailable" };
  }
}

export function readTelemetry() {
  return { source: "database", driver: databaseDriver(), ...TELEMETRY };
}

export async function readCatalog() {
  const driver = databaseDriver();
  const count = async (table: string) => {
    const [row] = await dbQuery<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
    return Number(row?.n ?? 0);
  };
  const [vessels, incidents, anomalies, passes, briefings] = await Promise.all([
    count("vessels"),
    count("incidents"),
    count("radar_anomalies"),
    count("satellite_passes"),
    count("briefing_requests"),
  ]);
  return {
    source: "database" as const,
    driver,
    schema: "sql/darkfleet.sql",
    file:
      driver === "sqlite"
        ? "data/aether.db"
        : mysqlSettings()
          ? `${mysqlSettings()!.host}:${mysqlSettings()!.port}/${mysqlSettings()!.database}`
          : null,
    vessels,
    incidents,
    anomalies,
    passes,
    briefings,
  };
}

export async function storeBriefing(input: {
  id: number;
  fullName: string;
  organization: string;
  email: string;
  focus: string;
  windowPref: string;
}): Promise<"stored" | "accepted"> {
  try {
    await dbQuery(
      "INSERT INTO briefing_requests (id, full_name, organization, email, focus_area, window_pref) VALUES (?, ?, ?, ?, ?, ?)",
      [input.id, input.fullName, input.organization, input.email, input.focus, input.windowPref]
    );
    return "stored";
  } catch {
    return "accepted";
  }
}
