import fs from "fs";
import mysql from "mysql2/promise";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

if (!/^[A-Za-z0-9_]+$/.test(env.DB_NAME)) {
  throw new Error("DB_NAME must be alphanumeric");
}

const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  multipleStatements: true,
  connectTimeout: 8000,
});

await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\``);
await connection.query(`USE \`${env.DB_NAME}\``);
const [tables] = await connection.query("SHOW TABLES LIKE 'vessels'");
if (!Array.isArray(tables) || tables.length === 0) {
  await connection.query(fs.readFileSync("sql/darkfleet.sql", "utf8"));
}
const [vessels] = await connection.query("SELECT COUNT(*) AS n FROM vessels");
const [incidents] = await connection.query("SELECT COUNT(*) AS n FROM incidents");
console.log(
  JSON.stringify({
    ok: true,
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    database: env.DB_NAME,
    vessels: vessels[0].n,
    incidents: incidents[0].n,
  })
);
await connection.end();
