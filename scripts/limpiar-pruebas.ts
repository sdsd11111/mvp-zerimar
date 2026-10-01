import { config } from "dotenv";
config({ path: ".env.local" });

import { q, exec } from "../lib/db";

async function limpiar() {
  const convs = await q<any>(
    `SELECT c.id FROM bot_conversaciones c
     JOIN bot_contactos ct ON ct.id = c.contacto_id
     WHERE ct.telefono LIKE '%967491847%'`
  );
  const ids: number[] = convs.map((c: any) => c.id);
  console.log("Conversaciones encontradas:", ids.length);

  for (const id of ids) {
    await exec("DELETE FROM bot_eventos WHERE conversacion_id=?", [id]);
    await exec("DELETE FROM bot_trazas WHERE conversacion_id=?", [id]);
    await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [id]);
    await exec("DELETE FROM bot_conversaciones WHERE id=?", [id]);
  }

  const del = await exec("DELETE FROM bot_contactos WHERE telefono LIKE '%967491847%'");
  console.log(`✅ Listo. ${ids.length} conversaciones y ${del.affectedRows} contacto(s) borrados.`);
  process.exit(0);
}

limpiar().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
