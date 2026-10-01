import { config } from "dotenv";
config({ path: ".env.local" });

import { q, exec } from "../lib/db";
import { procesarConversacion } from "../lib/bot";
import { ingresar } from "../lib/ingest";

// Preguntas 21 a 58: Sucursales y Horarios
const PREGUNTAS_FASE_2 = [
  // 2. Sucursales
  { id: 21, q: "¿Dónde queda Zerimar?", espera: ["ancón", "gran colombia", "centro", "loja"] },
  { id: 22, q: "¿Dónde queda la matriz?", espera: ["ancón", "gran colombia"] },
  { id: 23, q: "¿Dónde queda Zerimar Centro?", espera: ["18 de noviembre", "miguel riofrío", "rocafuerte"] },
  { id: 24, q: "¿Dónde queda Zerimar Las Pitas?", espera: ["8 de diciembre", "jaime roldós", "pitas"] },
  { id: 25, q: "¿Dónde queda Zerimar Catamayo?", espera: ["18 de agosto", "isidro ayora", "catamayo"] },
  { id: 26, q: "¿Dónde queda Zerimar Machala?", espera: ["tarqui", "rocafuerte", "bolívar", "machala"] },
  { id: 27, q: "¿Dónde queda Rocafrut?", espera: ["macará", "azuay", "peña", "mercadillo", "arupos", "loja"] },
  { id: 28, q: "¿Dónde queda Rocafrut de Macará y Azuay?", espera: ["macará", "azuay"] },
  { id: 29, q: "¿Dónde queda Rocafrut de José María Peña?", espera: ["josé maría peña", "mercadillo"] },
  { id: 30, q: "¿Dónde queda Rocafrut de Romerillos?", espera: ["romerillos", "arupos"] },
  { id: 31, q: "¿Dónde queda Rocafrut de Arupos?", espera: ["arupos", "romerillos"] },
  { id: 32, q: "¿Cuál es la sucursal más cercana al centro de Loja?", espera: ["centro", "18 de noviembre", "macará"] },
  { id: 33, q: "¿Cuál está más cerca de Las Pitas o Terminal?", espera: ["8 de diciembre", "pitas"] },
  { id: 34, q: "¿Tienen una sucursal en Catamayo?", espera: ["sí", "catamayo", "isidro ayora"] },
  { id: 35, q: "¿Tienen una sucursal en Machala?", espera: ["sí", "machala", "tarqui"] },
  { id: 36, q: "¿Tienen locales fuera de Loja?", espera: ["catamayo", "machala"] },
  { id: 37, q: "¿Cuál es la dirección exacta de la matriz?", espera: ["ancón", "gran colombia"] },
  { id: 38, q: "¿Tienen sucursal en Cuenca actualmente?", espera: ["cerrado", "no", "tenderito"] },
  { id: 39, q: "¿Tienen sucursal en Quito o Guayaquil?", espera: ["no", "loja", "catamayo", "machala"] },
  // 3. Horarios
  { id: 40, q: "¿A qué hora abre Zerimar?", espera: ["09:00", "08:30", "mañana"] },
  { id: 41, q: "¿A qué hora cierra Zerimar?", espera: ["21:00", "21:15", "21:30", "noche"] },
  { id: 42, q: "¿Está abierto Zerimar hoy?", espera: ["abierto", "horario", "lunes", "domingo"] },
  { id: 43, q: "¿A qué hora abre Rocafrut Macará?", espera: ["08:00", "mañana"] },
  { id: 44, q: "¿A qué hora cierra Rocafrut Macará?", espera: ["23:00", "21:00", "noche"] },
  { id: 45, q: "¿Abren los domingos?", espera: ["sí", "domingo", "abierto"] },
  { id: 46, q: "¿Atienden 24 horas?", espera: ["no", "24"] },
  { id: 47, q: "¿Cuál es el horario de la matriz?", espera: ["09:00", "21:15", "horario"] },
  { id: 48, q: "¿Cuál es el horario de Zerimar Machala?", espera: ["09:00", "20:30", "horario"] },
];

async function testear() {
  console.log("=================================================");
  console.log("🧪 INICIANDO SUITE DE PRUEBAS - FASE 2 (Sucursales y Horarios)");
  console.log("=================================================\n");

  const telefonoSimulado = "593999990002";
  let aprobadas = 0;
  let fallidas = 0;

  for (const item of PREGUNTAS_FASE_2) {
    const ing = await ingresar({
      jid: telefonoSimulado,
      nombre: "Tester QA 2",
      texto: item.q,
    });

    await procesarConversacion(ing.conversacionId);

    const [ultimoMsg] = await q<any>(
      "SELECT texto FROM bot_mensajes WHERE conversacion_id=? AND rol='bot' ORDER BY id DESC LIMIT 1",
      [ing.conversacionId]
    );

    const respuestaTexto = (ultimoMsg?.texto || "").toLowerCase();
    const aciertos = item.espera.filter((kw) => respuestaTexto.includes(kw));
    const pasa = aciertos.length > 0;

    if (pasa) {
      aprobadas++;
      console.log(`✅ [TEST ${item.id}] ${item.q}`);
      console.log(`   💬 Bot: "${ultimoMsg?.texto.replace(/\n/g, " ")}"`);
      console.log(`   🎯 Claves detectadas: [${aciertos.join(", ")}]\n`);
    } else {
      fallidas++;
      console.log(`❌ [TEST ${item.id}] ${item.q}`);
      console.log(`   💬 Bot: "${ultimoMsg?.texto.replace(/\n/g, " ")}"`);
      console.log(`   ⚠️ Esperaba alguna de: [${item.espera.join(", ")}]\n`);
    }

    await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [ing.conversacionId]);
    await exec("UPDATE bot_conversaciones SET bot_activo=1, estado='NUEVA', resumen=NULL WHERE id=?", [ing.conversacionId]);

    // Pausa breve de cortesía
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("=================================================");
  console.log(`📊 RESULTADO FASE 2: ${aprobadas}/${PREGUNTAS_FASE_2.length} Aprobadas | ${fallidas} Fallidas`);
  console.log("=================================================");

  process.exit(0);
}

testear().catch((err) => {
  console.error("Error en suite Fase 2:", err);
  process.exit(1);
});
