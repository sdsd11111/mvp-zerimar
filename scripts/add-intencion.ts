// scripts/add-intencion.ts
import mysql from "mysql2/promise";
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  console.log("Connecting to:", process.env.DB_HOST, process.env.DB_PORT);
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 30000,
  });
  console.log("Connected OK");
  try {
    await conn.query(
      "ALTER TABLE bot_conversaciones ADD COLUMN intencion VARCHAR(160) NULL AFTER estado"
    );
    console.log("OK: columna intencion agregada");
  } catch (e: any) {
    if (e.code === "ER_DUP_FIELDNAME") console.log("OK: columna ya existe");
    else { console.error("SQL error:", e.message, e.code); throw e; }
  }
  await conn.end();
  console.log("Done.");
}
main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
