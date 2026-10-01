// Uso:  npx tsx scripts/migrate.ts          -> esquema + seed
//       npx tsx scripts/migrate.ts schema   -> solo esquema
//       npx tsx scripts/migrate.ts sql/003_intencion.sql  -> corre un archivo SQL directamente
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import mysql from "mysql2/promise";

config({ path: ".env.local" });

async function main() {
  const only = process.argv[2]; // "schema" | "seed" | ruta de archivo SQL

  // Si se pasa una ruta que termina en .sql, correrla directamente
  if (only?.endsWith(".sql")) {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
      charset: "utf8mb4",
    });
    const sql = readFileSync(join(process.cwd(), only), "utf8");
    console.log(`> ${only}...`);
    await conn.query(sql);
    console.log("OK");
    await conn.end();
    return;
  }

  const files = [
    ["schema", "sql/001_schema.sql"],
    ["seed", "sql/002_seed.sql"],
  ].filter(([name]) => !only || only === name);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  for (const [name, path] of files) {
    const sql = readFileSync(join(process.cwd(), path), "utf8");
    console.log(`> ${name}...`);
    await conn.query(sql);
  }

  const [rows] = await conn.query(
    "SELECT (SELECT COUNT(*) FROM bot_sucursales) sucursales, (SELECT COUNT(*) FROM bot_productos) productos, (SELECT COUNT(*) FROM bot_faqs) faqs"
  );
  console.log("OK", rows);
  await conn.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
