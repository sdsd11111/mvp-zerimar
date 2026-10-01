import mysql from "mysql2/promise";
import type { ResultSetHeader } from "mysql2/promise";

const g = globalThis as unknown as { _pool?: mysql.Pool };

function crear() {
  const p = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 3, // hosting compartido: pocas conexiones
    maxIdle: 1,
    idleTimeout: 10000,
    charset: "utf8mb4",
    timezone: "Z",
  });
  // Todo en UTC, el CRM formatea a hora local.
  (p as any).pool.on("connection", (c: any) => c.query("SET time_zone = '+00:00'"));
  return p;
}

function getPool(): mysql.Pool {
  if (!g._pool) {
    g._pool = crear();
  }
  return g._pool;
}

export const pool = new Proxy({} as mysql.Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  }
});

export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function exec(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const [r] = await pool.query(sql, params);
  return r as ResultSetHeader;
}
