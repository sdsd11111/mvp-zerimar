import { config } from "dotenv";
config({ path: ".env.local" });
import { q, exec } from "../lib/db";
import { procesarConversacion } from "../lib/bot";
import { ingresar } from "../lib/ingest";

// Solo los 5 casos que fallaron en la suite anterior
const CASOS = [
  { id: 23, fase: "Sucursales", q: "Donde queda Zerimar Centro?",           espera: ["18 de noviembre", "miguel riofrio", "rocafuerte"] },
  { id: 27, fase: "Sucursales", q: "Donde queda Rocafrut?",                 espera: ["macara", "azuay", "pena", "mercadillo", "arupos", "loja"] },
  { id: 33, fase: "Sucursales", q: "Cual esta mas cerca de Las Pitas o Terminal?", espera: ["8 de diciembre", "pitas", "diciembre"] },
  { id: 41, fase: "Horarios",   q: "A que hora cierra Zerimar?",            espera: ["21:00", "21:15", "21:30", "noche"] },
  { id: 44, fase: "Horarios",   q: "A que hora cierra Rocafrut Macara?",    espera: ["23:00", "20:00", "noche"] },
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function limpiar(convId: number) {
  await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [convId]);
  await exec(
    "UPDATE bot_conversaciones SET bot_activo=1, estado='NUEVA', resumen=NULL, intentos_fallidos=0, intencion=NULL WHERE id=?",
    [convId]
  );
}

async function testear() {
  console.log("=== RE-TEST DE LOS 5 CASOS FALLIDOS ===\n");
  const telefono = "593999990077";
  let ok = 0, fail = 0;

  for (const caso of CASOS) {
    const ing = await ingresar({ jid: telefono, nombre: "Retester", texto: caso.q });
    await limpiar(ing.conversacionId);
    await exec(
      "INSERT INTO bot_mensajes (conversacion_id, rol, texto, procesado) VALUES (?, 'cliente', ?, 0)",
      [ing.conversacionId, caso.q]
    );
    await procesarConversacion(ing.conversacionId);
    const [ultimo] = await q<any>(
      "SELECT texto FROM bot_mensajes WHERE conversacion_id=? AND rol='bot' ORDER BY id DESC LIMIT 1",
      [ing.conversacionId]
    );
    const respuestaRaw = ultimo?.texto || "";
    const respuesta = norm(respuestaRaw);
    const aciertos = caso.espera.filter((kw) => respuesta.includes(norm(kw)));
    const pasa = aciertos.length > 0;

    if (pasa) {
      ok++;
      console.log(`✅ [${caso.id}] ${caso.q}`);
      console.log(`   Bot: "${respuestaRaw.replace(/\n/g, " ").slice(0, 120)}"`);
      console.log(`   Claves: [${aciertos.join(", ")}]`);
    } else {
      fail++;
      console.log(`❌ [${caso.id}] ${caso.q}`);
      console.log(`   Bot: "${respuestaRaw.replace(/\n/g, " ").slice(0, 120)}"`);
      console.log(`   Esperaba: [${caso.espera.join(", ")}]`);
    }
    await limpiar(ing.conversacionId);
    await new Promise((r) => setTimeout(r, 2500));
  }

  console.log(`\n=== RESULTADO RE-TEST: ${ok}/5 OK | ${fail} FAIL ===`);
  process.exit(0);
}

testear().catch((e: any) => { console.error(e.message); process.exit(1); });
