import { config } from "dotenv";
config({ path: ".env.local" });
import { exec as dbExec, q } from "../lib/db";

async function fix() {
  await dbExec(
    "UPDATE bot_sucursales SET direccion=? WHERE nombre='Zerimar 8 de Diciembre'",
    ["Av. 8 de Diciembre y Jaime Roldós Aguilera (Sector Las Pitas / Terminal Terrestre)"]
  );
  const rows = await q<any>(
    "SELECT nombre, direccion FROM bot_sucursales WHERE nombre LIKE '%Diciembre%'"
  );
  rows.forEach((r: any) => console.log("OK ->", r.nombre, "|", r.direccion));
  process.exit(0);
}
fix().catch((e: any) => { console.error(e.message); process.exit(1); });
