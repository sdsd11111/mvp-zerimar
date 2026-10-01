import { config } from "dotenv";
config({ path: ".env.local" });

import { ingresar } from "../lib/ingest";
import { procesarConversacion } from "../lib/bot";
import { q } from "../lib/db";

async function run() {
  console.log("=== 1. Probando ingreso de mensaje ===");
  const res = await ingresar({
    jid: "593991234567",
    nombre: "Carlos Mendoza",
    texto: "Hola buenas tardes, ¿tienen pulpa de maracuyá congelada y cuánto cuesta?",
  });
  console.log("Mensaje ingresado:", res);

  console.log("=== 2. Procesando con el bot de IA (Gemini) ===");
  const botRes = await procesarConversacion(res.conversacionId);
  console.log("Respuesta del bot:", botRes);

  console.log("=== 3. Verificando estado en base de datos ===");
  const [conv] = await q<any>("SELECT * FROM bot_conversaciones WHERE id=?", [res.conversacionId]);
  console.log("Conversación guardada:", conv);

  const msgs = await q<any>("SELECT rol, texto, creado_en FROM bot_mensajes WHERE conversacion_id=?", [res.conversacionId]);
  console.log("Mensajes guardados en la BD:", msgs);

  process.exit(0);
}

run().catch((err) => {
  console.error("Error en test:", err);
  process.exit(1);
});
