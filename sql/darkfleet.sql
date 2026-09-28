-- AETHER-SAR dark-fleet schema
-- One DDL body runs on MySQL 8, TiDB, and PostgreSQL 14+.
-- Load the whole file. Identifiers are unquoted lowercase.
-- JSON literals coerce into JSON columns on both engines.

-- ---------------------------------------------------------------------------
-- vessels
-- ---------------------------------------------------------------------------
CREATE TABLE vessels (
  id BIGINT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  imo VARCHAR(16),
  mmsi VARCHAR(16),
  flag_country VARCHAR(80) NOT NULL,
  vessel_type VARCHAR(32) NOT NULL,
  length_meters DECIMAL(7,2) NOT NULL,
  beam_meters DECIMAL(6,2) NOT NULL,
  last_reported_lat DECIMAL(9,6),
  last_reported_lng DECIMAL(9,6),
  status VARCHAR(32) NOT NULL
);

CREATE UNIQUE INDEX idx_vessels_imo ON vessels (imo);
CREATE UNIQUE INDEX idx_vessels_mmsi ON vessels (mmsi);
CREATE INDEX idx_vessels_status ON vessels (status);
CREATE INDEX idx_vessels_type ON vessels (vessel_type);

-- vessel_type: crude_tanker | cargo | fishing | reefer
-- status: active_ais | dark_suspect | confirmed_illicit | spoofing

-- ---------------------------------------------------------------------------
-- satellite_passes
-- ---------------------------------------------------------------------------
CREATE TABLE satellite_passes (
  id BIGINT PRIMARY KEY,
  satellite_name VARCHAR(80) NOT NULL,
  band VARCHAR(32) NOT NULL,
  footprint_geojson JSON NOT NULL,
  pass_timestamp TIMESTAMP NOT NULL
);

CREATE INDEX idx_passes_satellite ON satellite_passes (satellite_name);
CREATE INDEX idx_passes_time ON satellite_passes (pass_timestamp);

-- satellite_name: Sentinel-1A | Sentinel-1B | Capella-2 | ICEYE | Umbra-04
-- band: C-Band | X-Band

-- ---------------------------------------------------------------------------
-- radar_anomalies
-- ---------------------------------------------------------------------------
CREATE TABLE radar_anomalies (
  id BIGINT PRIMARY KEY,
  satellite_pass_id BIGINT NOT NULL,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  estimated_length DECIMAL(7,2) NOT NULL,
  estimated_beam DECIMAL(6,2) NOT NULL,
  backscatter_db DECIMAL(6,2) NOT NULL,
  nearest_known_ais_distance_nm DECIMAL(8,2) NOT NULL,
  confidence_score DECIMAL(5,2) NOT NULL,
  status VARCHAR(40) NOT NULL,
  CONSTRAINT fk_anomaly_pass FOREIGN KEY (satellite_pass_id) REFERENCES satellite_passes (id)
);

CREATE INDEX idx_anomalies_status ON radar_anomalies (status);
CREATE INDEX idx_anomalies_pass ON radar_anomalies (satellite_pass_id);

-- status: unidentified | matched_dead_reckoning | confirmed_dark_fleet

-- ---------------------------------------------------------------------------
-- incidents
-- ---------------------------------------------------------------------------
CREATE TABLE incidents (
  id BIGINT PRIMARY KEY,
  title VARCHAR(240) NOT NULL,
  incident_type VARCHAR(40) NOT NULL,
  vessel_id BIGINT,
  anomaly_id BIGINT,
  severity VARCHAR(16) NOT NULL,
  timeline_json JSON NOT NULL,
  intelligence_summary TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_incident_vessel FOREIGN KEY (vessel_id) REFERENCES vessels (id),
  CONSTRAINT fk_incident_anomaly FOREIGN KEY (anomaly_id) REFERENCES radar_anomalies (id)
);

CREATE INDEX idx_incidents_type ON incidents (incident_type);
CREATE INDEX idx_incidents_severity ON incidents (severity);
CREATE INDEX idx_incidents_created ON incidents (created_at);

-- incident_type: sts_transfer | sanctions_evasion | iuu_fishing | transponder_spoof
-- severity: critical | high | medium

-- ---------------------------------------------------------------------------
-- briefing_requests (defense-briefing desk)
-- ---------------------------------------------------------------------------
CREATE TABLE briefing_requests (
  id BIGINT PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  organization VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  focus_area VARCHAR(64) NOT NULL,
  window_pref VARCHAR(160),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- seed
-- ---------------------------------------------------------------------------
INSERT INTO vessels (id, name, imo, mmsi, flag_country, vessel_type, length_meters, beam_meters, last_reported_lat, last_reported_lng, status) VALUES
  (1001, 'ORION STAR', '9384412', '357891004', 'Panama', 'crude_tanker', 274.00, 48.00, 24.550000, 59.100000, 'confirmed_illicit'),
  (1002, 'UNFLAGGED HULL KH-04', NULL, NULL, 'Unknown', 'crude_tanker', 280.00, 50.00, 23.900000, 58.000000, 'confirmed_illicit'),
  (1003, 'VOLGA-7', '9412208', '273456110', 'Cameroon', 'cargo', 189.00, 32.00, 59.100000, 22.300000, 'spoofing'),
  (1004, 'PACIFIC LYNX', '9367781', '352001192', 'Panama', 'crude_tanker', 244.00, 42.00, 22.400000, 60.800000, 'dark_suspect'),
  (1005, 'NORDIC VEIL', '9521004', '613445210', 'Cameroon', 'crude_tanker', 250.00, 44.00, 36.200000, 23.100000, 'dark_suspect'),
  (1006, 'DEEP OCEAN IUU CLUSTER', NULL, NULL, 'Unknown', 'fishing', 54.00, 10.00, -3.800000, -172.000000, 'confirmed_illicit'),
  (1007, 'MALACCA GHOST', '9401126', '563882190', 'Singapore', 'crude_tanker', 228.00, 40.00, 2.100000, 102.400000, 'dark_suspect'),
  (1008, 'SCS RENDEZVOUS', '9453301', '477882331', 'Hong Kong', 'crude_tanker', 263.00, 46.00, 14.200000, 114.800000, 'confirmed_illicit');

INSERT INTO satellite_passes (id, satellite_name, band, footprint_geojson, pass_timestamp) VALUES
  (2001, 'Sentinel-1B', 'C-Band', '{"type":"Polygon","coordinates":[[[57.6,25.4],[59.6,25.2],[59.8,23.4],[57.8,23.6],[57.6,25.4]]]}', '2026-09-28 08:40:00'),
  (2002, 'Capella-2', 'X-Band', '{"type":"Polygon","coordinates":[[[21.4,59.8],[23.2,59.9],[23.0,58.6],[21.2,58.5],[21.4,59.8]]]}', '2026-09-28 05:15:00'),
  (2003, 'ICEYE', 'X-Band', '{"type":"Polygon","coordinates":[[[113.2,15.4],[116.0,15.6],[115.6,12.8],[112.8,12.6],[113.2,15.4]]]}', '2026-09-28 11:05:00'),
  (2004, 'Umbra-04', 'X-Band', '{"type":"Polygon","coordinates":[[[-173.4,-2.6],[-170.6,-2.5],[-170.7,-4.8],[-173.5,-4.9],[-173.4,-2.6]]]}', '2026-09-27 22:10:00');

INSERT INTO radar_anomalies (id, satellite_pass_id, lat, lng, estimated_length, estimated_beam, backscatter_db, nearest_known_ais_distance_nm, confidence_score, status) VALUES
  (8491, 2001, 24.300000, 58.516700, 280.00, 49.00, 14.80, 18.40, 96.80, 'confirmed_dark_fleet'),
  (8492, 2001, 24.280000, 58.470000, 274.00, 48.00, 13.10, 0.40, 94.20, 'matched_dead_reckoning'),
  (8504, 2002, 59.100000, 22.300000, 188.00, 32.00, 11.40, 79.70, 91.50, 'confirmed_dark_fleet'),
  (8510, 2004, -3.820000, -172.050000, 52.00, 10.00, 8.60, 6.20, 88.40, 'confirmed_dark_fleet'),
  (8522, 2003, 14.180000, 114.760000, 260.00, 45.00, 12.70, 22.00, 90.10, 'matched_dead_reckoning'),
  (8530, 2001, 22.410000, 60.820000, 244.00, 42.00, 9.90, 14.20, 84.00, 'unidentified');

INSERT INTO incidents (id, title, incident_type, vessel_id, anomaly_id, severity, timeline_json, intelligence_summary, created_at) VALUES
  (3001, 'Vessel ORION STAR (Flag: Panama)', 'sts_transfer', 1001, 8491, 'critical',
   '[{"hoursAgo":36,"label":"Departed Fujairah anchorage, AIS normal"},{"hoursAgo":18,"label":"Transited Strait of Hormuz eastbound"},{"hoursAgo":14,"label":"AIS transponder ceased"},{"hoursAgo":6,"label":"Sentinel-1 C-band pass, dual hull return 0.4 nm, 14.8 dB"},{"hoursAgo":0,"label":"Dead reckoning holds both hulls in the Gulf of Oman"}]',
   'Transponder killed 14 hours ago in Persian Gulf. Radar detected side-by-side with unflagged supertanker. Kinematic length profile matches ORION STAR at 96.8 percent.',
   '2026-09-28 09:05:00'),
  (3002, 'Ghost Cargo VOLGA-7', 'transponder_spoof', 1003, 8504, 'critical',
   '[{"hoursAgo":20,"label":"AIS begins a closed loop over Tallinn Airport"},{"hoursAgo":5,"label":"Capella X-band places the hull 80 nm offshore"},{"hoursAgo":0,"label":"False AIS track still broadcasting ashore"}]',
   'GPS spoofing detected (broadcasting location in airport while radar places it 80 nautical miles offshore).',
   '2026-09-28 06:40:00'),
  (3003, 'Deep Ocean IUU Fleet', 'iuu_fishing', 1006, 8510, 'high',
   '[{"hoursAgo":30,"label":"Six trawlers enter Phoenix Islands Protected Area"},{"hoursAgo":11,"label":"Umbra-04 images the cluster inside the reserve"},{"hoursAgo":0,"label":"Three hulls remain dark inside the boundary"}]',
   '6 unauthorized trawlers clustered inside Marine Protected Reserve boundary.',
   '2026-09-28 01:20:00'),
  (3004, 'Tanker NORDIC VEIL sanctions dark period', 'sanctions_evasion', 1005, NULL, 'high',
   '[{"hoursAgo":16,"label":"AIS ceased south of the Peloponnese"},{"hoursAgo":9,"label":"Dead-reckoning cone enters a known STS box"},{"hoursAgo":0,"label":"No clean ownership chain on the Cameroon flag registration"}]',
   'Sanctioned-cargo indicators. Flag hopped to Cameroon 19 days ago. AIS dark through a historic ship-to-ship box.',
   '2026-09-28 04:10:00');
