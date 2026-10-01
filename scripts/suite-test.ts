import { config } from "dotenv";
config({ path: ".env.local" });

import { q, exec } from "../lib/db";
import { procesarConversacion } from "../lib/bot";
import { ingresar } from "../lib/ingest";

// Preguntas 1 a 20 de la Fase 1: Identidad y Empresa
const PREGUNTAS_FASE_1 = [
  { id: 1, q: "¿Qué es Zerimar?", espera: ["supermercado", "comercializadora", "víveres", "loja"] },
  { id: 2, q: "¿Zerimar y Rocafrut son la misma empresa?", espera: ["misma", "comercializadora ramírez galván", "grupo"] },
  { id: 3, q: "¿Rocafrut pertenece a Zerimar?", espera: ["comercializadora ramírez galván", "marca", "misma empresa"] },
  { id: 4, q: "¿Cuál es la razón social de Zerimar?", espera: ["comercializadora ramírez galván"] },
  { id: 5, q: "¿Cuál es el RUC de la empresa?", espera: ["1191729486001"] },
  { id: 6, q: "¿Qué otras marcas pertenecen a la empresa?", espera: ["ferrimar", "rocafrut", "tenderito"] },
  { id: 7, q: "¿Qué es Rocka Frut?", espera: ["frutas", "verduras", "frescas"] },
  { id: 8, q: "¿Qué es Ferrimar?", espera: ["ferretería", "herramientas", "maquinaria"] },
  { id: 9, q: "¿Qué es Tenderito?", espera: ["cuenca", "cerrado", "marca"] },
  { id: 10, q: "¿Desde cuándo existe Zerimar?", espera: ["1995", "2009"] },
  { id: 11, q: "¿Dónde nació Zerimar?", espera: ["loja"] },
  { id: 12, q: "¿Quién es el propietario o representante legal de Zerimar?", espera: ["jorge", "ramírez"] },
  { id: 13, q: "¿Dónde está la matriz?", espera: ["ancón", "gran colombia"] },
  { id: 14, q: "¿En qué ciudades tiene presencia?", espera: ["loja", "catamayo", "machala"] },
  { id: 15, q: "¿Cuántas sucursales o locales tienen en total?", espera: ["15", "establecimientos"] },
  { id: 16, q: "¿Zerimar es una empresa de Loja?", espera: ["sí", "loja"] },
  { id: 17, q: "¿Zerimar también está en Machala?", espera: ["sí", "machala", "tarqui"] },
  { id: 18, q: "¿Zerimar también está en Catamayo?", espera: ["sí", "catamayo", "isidro ayora"] },
  { id: 19, q: "¿Tienen delivery propio?", espera: ["no", "asesor", "pedidos"] },
  { id: 20, q: "¿Aceptan tarjeta de crédito?", espera: ["sí", "tarjeta", "débito", "crédito"] },
];

async function testear() {
  console.log("=================================================");
  console.log("🧪 INICIANDO SUITE DE PRUEBAS - FASE 1 (Identidad y Empresa)");
  console.log("=================================================\n");

  const telefonoSimulado = "593999990001";
  let aprobadas = 0;
  let fallidas = 0;

  for (const item of PREGUNTAS_FASE_1) {
    // Ingresar mensaje
    const ing = await ingresar({
      jid: telefonoSimulado,
      nombre: "Tester QA",
      texto: item.q,
    });

    // Procesar con el bot
    await procesarConversacion(ing.conversacionId);

    // Obtener la respuesta que dio el bot
    const [ultimoMsg] = await q<any>(
      "SELECT texto FROM bot_mensajes WHERE conversacion_id=? AND rol='bot' ORDER BY id DESC LIMIT 1",
      [ing.conversacionId]
    );

    const respuestaTexto = (ultimoMsg?.texto || "").toLowerCase();

    // Evaluar si contiene al menos uno o dos de los conceptos clave esperados
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

    // Resetear conversación para aislar cada prueba unitaria de identidad
    await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [ing.conversacionId]);
    await exec("UPDATE bot_conversaciones SET bot_activo=1, estado='NUEVA', resumen=NULL WHERE id=?", [ing.conversacionId]);

    // Pausa para respetar la cuota y budget in-flight
    await new Promise((r) => setTimeout(r, 3500));
  }

  console.log("=================================================");
  console.log(`📊 RESULTADO FASE 1: ${aprobadas}/${PREGUNTAS_FASE_1.length} Aprobadas | ${fallidas} Fallidas`);
  console.log("=================================================");

  process.exit(0);
}

testear().catch((err) => {
  console.error("Error en suite de pruebas:", err);
  process.exit(1);
});
