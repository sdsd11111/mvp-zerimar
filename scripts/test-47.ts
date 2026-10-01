import { config } from "dotenv";
config({ path: ".env.local" });
import { q, exec } from "../lib/db";
import { procesarConversacion } from "../lib/bot";
import { ingresar } from "../lib/ingest";

async function test47() {
  const ing = await ingresar({ jid: "593999990088", nombre: "Tester47", texto: "Cual es el horario de la matriz?" });
  await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [ing.conversacionId]);
  await exec(
    "UPDATE bot_conversaciones SET bot_activo=1, estado='NUEVA', resumen=NULL, intentos_fallidos=0, intencion=NULL WHERE id=?",
    [ing.conversacionId]
  );
  await exec(
    "INSERT INTO bot_mensajes (conversacion_id, rol, texto, procesado) VALUES (?, 'cliente', 'Cual es el horario de la matriz?', 0)",
    [ing.conversacionId]
  );
  await procesarConversacion(ing.conversacionId);
  const [ultimo] = await q<any>(
    "SELECT texto FROM bot_mensajes WHERE conversacion_id=? AND rol='bot' ORDER BY id DESC LIMIT 1",
    [ing.conversacionId]
  );
  console.log("=== RESPUESTA COMPLETA CASO 47 ===");
  console.log(ultimo?.texto);
  process.exit(0);
}

test47().catch(console.error);
