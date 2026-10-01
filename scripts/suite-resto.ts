import { config } from "dotenv";
config({ path: ".env.local" });

import { q, exec } from "../lib/db";
import { procesarConversacion } from "../lib/bot";
import { ingresar } from "../lib/ingest";

interface Caso {
  id: number;
  fase: string;
  q: string;
  espera: string[];
  noQuiero?: string[];
}

const CASOS: Caso[] = [
  { id: 74, fase: "Anti-aluc", q: "Desde cuando existe Zerimar?", espera: ["1995", "2009"] },
  { id: 75, fase: "Anti-aluc", q: "Tienen pizza?", espera: ["no", "pizza", "panaderia", "asesor"] },
  { id: 76, fase: "Escalado", q: "Quiero hablar con un asesor", espera: ["asesor", "humano", "comparto", "escribiran"] },
  { id: 77, fase: "Escalado", q: "Quiero hacer una queja", espera: ["asesor", "queja", "humano", "disculpa"] },
  { id: 78, fase: "Escalado", q: "Puedo devolver un producto que compre?", espera: ["asesor", "devolucion", "humano"] },
  { id: 79, fase: "Escalado", q: "Necesito una cotizacion al por mayor de arroz", espera: ["asesor", "mayor", "cotizacion"] },
  { id: 80, fase: "Identidad", q: "Zerimar y Rocafrut son la misma empresa?", espera: ["si", "comercializadora", "ramirez galvan", "misma"] },
  { id: 81, fase: "Identidad", q: "Que es Ferrimar?", espera: ["ferreteria", "ferrimar", "maquinaria"] },
  { id: 82, fase: "Identidad", q: "Que es Tenderito?", espera: ["tenderito", "cuenca", "cerrado"] },
  { id: 83, fase: "Identidad", q: "Cuantas sucursales tienen?", espera: ["15", "quince", "sucursal"] },
  { id: 84, fase: "Identidad", q: "Donde nacio Zerimar?", espera: ["loja", "1995"] },
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function limpiarConversacion(convId: number) {
  await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [convId]);
  await exec(
    "UPDATE bot_conversaciones SET bot_activo=1, estado='NUEVA', resumen=NULL, intentos_fallidos=0, intencion=NULL WHERE id=?",
    [convId]
  );
}

async function testear() {
  console.log("=========================================================");
  console.log("SUITE RESTO -- Casos 74-84");
  console.log("=========================================================\n");

  const telefono = "593999990099";
  let aprobadas = 0;
  let fallidas = 0;
  const fallidosDetalle: string[] = [];
  let faseActual = "";

  for (const caso of CASOS) {
    if (caso.fase !== faseActual) {
      faseActual = caso.fase;
      console.log(`\n---- ${faseActual.toUpperCase()} ----`);
    }

    const ing = await ingresar({ jid: telefono, nombre: "Tester QA Suite", texto: caso.q });
    await limpiarConversacion(ing.conversacionId);
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
    const violaciones = (caso.noQuiero ?? []).filter((kw) => respuesta.includes(norm(kw)));
    const pasa = aciertos.length > 0 && violaciones.length === 0;

    if (pasa) {
      aprobadas++;
      console.log(`[OK] [${caso.id}] ${caso.q}`);
      console.log(`     Bot: "${respuestaRaw.replace(/\n/g, " ").slice(0, 110)}"`);
      console.log(`     Claves: [${aciertos.join(", ")}]`);
    } else {
      fallidas++;
      const motivo = aciertos.length === 0 ? `no encontro: [${caso.espera.join(", ")}]` : `prohibido: [${violaciones.join(", ")}]`;
      console.log(`[FAIL] [${caso.id}] ${caso.q}`);
      console.log(`     Bot: "${respuestaRaw.replace(/\n/g, " ").slice(0, 110)}"`);
      console.log(`     >> ${motivo}`);
      fallidosDetalle.push(`[${caso.id}] ${caso.q} => ${motivo}`);
    }

    await limpiarConversacion(ing.conversacionId);
    await new Promise((r) => setTimeout(r, 3500));
  }

  const totalOK = 52 + aprobadas;
  const totalFail = 1 + fallidas;
  const totalCasos = 64;
  const pct = Math.round((totalOK / totalCasos) * 100);

  console.log("\n=========================================================");
  console.log(`RESULTADO PARCIAL (74-84): ${aprobadas}/${CASOS.length} OK | ${fallidas} FAIL`);
  console.log(`RESULTADO TOTAL: ${totalOK}/${totalCasos} OK | ${totalFail} FAIL`);
  console.log(`Tasa de exito: ${pct}% ${pct >= 90 ? "[VERDE]" : pct >= 70 ? "[AMARILLO]" : "[ROJO]"}`);
  if (fallidosDetalle.length) {
    console.log("\nFallos:");
    fallidosDetalle.forEach((d) => console.log("  -", d));
  } else {
    console.log("\nTodas las pruebas pasaron!");
  }
  console.log("=========================================================");
  process.exit(0);
}

testear().catch((err) => { console.error("Error fatal:", err); process.exit(1); });
