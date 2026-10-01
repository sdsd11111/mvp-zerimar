import { config } from "dotenv";
config({ path: ".env.local" });
import { exec as dbExec, q } from "../lib/db";

async function fix() {
  console.log("Corrigiendo datos en bot_sucursales...\n");

  // ── Horarios corregidos según knowledge file (fuente oficial) ──
  const horarioFixes: Array<{ where: string; horario: object; direccion?: string; nombre?: string }> = [
    {
      where: "nombre='Zerimar Matriz Ancón'",
      horario: { "lun-dom": "09:00-21:15" },
    },
    {
      where: "nombre='Zerimar Centro'",
      horario: { "lun-vie": "09:00-21:30", "sab": "08:30-21:00", "dom": "08:30-21:00" },
      // direccion ya es correcta: 18 de Noviembre y Miguel Riofrío
    },
    {
      where: "nombre='Zerimar 8 de Diciembre'",
      horario: { "lun-dom": "09:00-21:15" },
      // Esta es la sucursal Las Pitas - dirección ya correcta
    },
    {
      where: "nombre='Zerimar Machala'",
      horario: { "lun-dom": "09:00-20:30" },
    },
    {
      where: "nombre='Rocafrut Macará'",
      horario: { "lun-sab": "08:00-23:00", "dom": "08:00-21:00" },
      direccion: "Calle Macará y Azuay, Loja",
    },
    {
      where: "nombre='Rocafrut Arupos'",
      horario: { "lun-sab": "08:00-20:00", "dom": "09:00-14:00" },
      direccion: "Romerillos S/N y Arupos, Loja",
    },
    {
      where: "nombre='Rocafrut Av. Salvador Bustamante Celi'",
      horario: { "lun-sab": "08:00-20:30", "dom": "09:00-15:00" },
    },
  ];

  for (const f of horarioFixes) {
    const h = JSON.stringify(f.horario);
    await dbExec(`UPDATE bot_sucursales SET horario=? WHERE ${f.where}`, [h]);
    if (f.direccion) {
      await dbExec(`UPDATE bot_sucursales SET direccion=? WHERE ${f.where}`, [f.direccion]);
    }
    console.log("  Updated:", f.where);
  }

  // Renombrar "Rocafrut Centro" -> "Rocafrut José María Peña" si aún tiene ese nombre
  await dbExec(
    "UPDATE bot_sucursales SET nombre='Rocafrut José María Peña', direccion='José María Peña 11-68 y Mercadillo, Loja' WHERE nombre='Rocafrut Centro'"
  );
  console.log("  Renamed Rocafrut Centro -> José María Peña");

  // ── Insertar Zerimar Catamayo si no existe ──
  const rows = await q<any>("SELECT id FROM bot_sucursales WHERE nombre LIKE '%Catamayo%'");
  if (!rows.length) {
    await dbExec(
      "INSERT INTO bot_sucursales (empresa, nombre, direccion, ciudad, horario, activa) VALUES (?, ?, ?, ?, ?, 1)",
      [
        "zerimar",
        "Zerimar Catamayo",
        "Calle 18 de Agosto y Av. Isidro Ayora (esq. Cajero Mego)",
        "Catamayo",
        JSON.stringify({ "lun-dom": "09:00-21:00" }),
      ]
    );
    console.log("  INSERT Zerimar Catamayo OK");
  } else {
    console.log("  Catamayo ya existe, omitido");
  }

  // ── Verificación final ──
  console.log("\nEstado final de bot_sucursales:\n");
  const all = await q<any>(
    "SELECT empresa, nombre, ciudad, direccion, JSON_UNQUOTE(horario) AS h FROM bot_sucursales WHERE activa=1 ORDER BY empresa, nombre"
  );
  for (const r of all) {
    console.log(`  [${r.empresa}] ${r.nombre}`);
    console.log(`    Dir: ${r.direccion}`);
    console.log(`    Horario: ${r.h}`);
  }

  process.exit(0);
}

fix().catch((e: any) => {
  console.error("Error:", e.message);
  process.exit(1);
});
