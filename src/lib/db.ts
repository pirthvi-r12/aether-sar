import fs from "fs";
import path from "path";
import type { DatabaseSync } from "node:sqlite";
import type { Pool as MyPool } from "mysql2/promise";
import type { Pool as PgPool } from "pg";

export type DbDriver = "sqlite" | "postgres" | "mysql";

type GlobalDb = {
  sqlite?: DatabaseSync;
  pgPool?: PgPool;
  myPool?: MyPool;
};

const globalDb = globalThis as typeof globalThis & GlobalDb;

const SCHEMA_PATH = path.join(process.cwd(), "sql", "darkfleet.sql");
const SQLITE_PATH = path.join(process.cwd(), "data", "aether.db");

export function mysqlSettings() {
  const host = process.env.DB_HOST?.trim();
  const database = process.env.DB_NAME?.trim();
  if (!host || !database) return null;
  if (!/^[A-Za-z0-9_]+$/.test(database)) return null;
  return {
    host,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    database,
  };
}

export function databaseDriver(url = process.env.DATABASE_URL): DbDriver {
  if (mysqlSettings()) return "mysql";
  const value = url?.trim();
  if (!value) return "sqlite";
  if (value.startsWith("postgres://") || value.startsWith("postgresql://")) return "postgres";
  if (value.startsWith("file:") || value.endsWith(".db")) return "sqlite";
  return "mysql";
}

export function sqliteFilePath(): string {
  return SQLITE_PATH;
}

function wantsSsl(url: string): boolean {
  if (/sslmode=disable/i.test(url)) return false;
  return /sslmode=require|neon\.tech|tidb|ssl=true/i.test(url);
}

function mysqlSsl(): { rejectUnauthorized: true } | undefined {
  const flag = process.env.DB_SSL?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return undefined;
  if (flag === "true" || flag === "1" || flag === "require") return { rejectUnauthorized: true };
  return undefined;
}

function isLocalMysql(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function toPostgres(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function ensureSqlite(): Promise<DatabaseSync> {
  if (globalDb.sqlite) return globalDb.sqlite;
  const { DatabaseSync } = await import("node:sqlite");
  fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });
  const db = new DatabaseSync(SQLITE_PATH);
  db.exec("PRAGMA foreign_keys = ON");
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vessels'").get();
  if (!existing) db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
  globalDb.sqlite = db;
  return db;
}

async function getPgPool(url: string): Promise<PgPool> {
  if (!globalDb.pgPool) {
    const { Pool } = await import("pg");
    globalDb.pgPool = new Pool({
      connectionString: url,
      max: 4,
      connectionTimeoutMillis: 8000,
      ssl: wantsSsl(url) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalDb.pgPool;
}

async function ensureMysqlReady(): Promise<void> {
  const settings = mysqlSettings();
  if (!settings || globalDb.myPool) return;
  const mysql = await import("mysql2/promise");
  const ssl = mysqlSsl();
  const admin = await mysql.createConnection({
    host: settings.host,
    port: settings.port,
    user: settings.user,
    password: settings.password,
    database: isLocalMysql(settings.host) ? undefined : settings.database,
    multipleStatements: true,
    connectTimeout: 20000,
    ssl,
  });
  if (isLocalMysql(settings.host)) {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${settings.database}\``);
    await admin.query(`USE \`${settings.database}\``);
  }
  const [tables] = await admin.query("SHOW TABLES LIKE 'vessels'");
  if (!Array.isArray(tables) || tables.length === 0) {
    await admin.query(fs.readFileSync(SCHEMA_PATH, "utf8"));
  }
  await admin.end();
}

async function getMyPool(url?: string): Promise<MyPool> {
  if (!globalDb.myPool) {
    const mysql = await import("mysql2/promise");
    const settings = mysqlSettings();
    if (settings) await ensureMysqlReady();
    globalDb.myPool = settings
      ? mysql.createPool({
          host: settings.host,
          port: settings.port,
          user: settings.user,
          password: settings.password,
          database: settings.database,
          connectionLimit: 4,
          connectTimeout: 20000,
          ssl: mysqlSsl(),
        })
      : mysql.createPool({
          uri: url,
          connectionLimit: 4,
          connectTimeout: 8000,
          ssl: url && wantsSsl(url) ? { rejectUnauthorized: true } : undefined,
        });
  }
  return globalDb.myPool;
}

export async function dbQuery<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL?.trim();
  const driver = databaseDriver(url);

  if (driver === "sqlite") {
    const db = await ensureSqlite();
    const statement = db.prepare(sql);
    const text = sql.trim().toUpperCase();
    if (text.startsWith("SELECT") || text.startsWith("WITH") || text.startsWith("PRAGMA")) {
      return statement.all(...params) as T[];
    }
    statement.run(...params);
    return [];
  }

  if (driver === "postgres") {
    if (!url) return [];
    const pool = await getPgPool(url);
    const result = await pool.query(toPostgres(sql), params);
    return result.rows as T[];
  }

  const pool = await getMyPool(url);
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function pingDatabase(): Promise<{ configured: boolean; driver: string; ok: boolean; file?: string }> {
  const driver = databaseDriver();
  try {
    await dbQuery("SELECT 1 AS ok");
    const mysql = mysqlSettings();
    return {
      configured: true,
      driver,
      ok: true,
      file: driver === "sqlite" ? "data/aether.db" : mysql ? `${mysql.host}:${mysql.port}/${mysql.database}` : undefined,
    };
  } catch {
    return { configured: true, driver, ok: false };
  }
}
