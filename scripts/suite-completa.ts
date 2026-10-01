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
  // FASE 2A: Sucursales
  { id: 21, fase: "Sucursales", q: "Donde queda Zerimar?", espera: ["ancon", "gran colombia", "centro", "loja"] },
  { id: 22, fase: "Sucursales", q: "Donde queda la matriz?", espera: ["ancon", "gran colombia"] },
  { id: 23, fase: "Sucursales", q: "Donde queda Zerimar Centro?", espera: ["18 de noviembre", "miguel riofrio", "rocafuerte"] },
  { id: 24, fase: "Sucursales", q: "Donde queda Zerimar Las Pitas?", espera: ["8 de diciembre", "jaime roldos", "pitas"] },
  { id: 25, fase: "Sucursales", q: "Donde queda Zerimar Catamayo?", espera: ["18 de agosto", "isidro ayora", "catamayo"] },
  { id: 26, fase: "Sucursales", q: "Donde queda Zerimar Machala?", espera: ["tarqui", "rocafuerte", "machala"] },
  { id: 27, fase: "Sucursales", q: "Donde queda Rocafrut?", espera: ["macara", "azuay", "pena", "mercadillo", "arupos", "loja"] },
  { id: 28, fase: "Sucursales", q: "Donde queda Rocafrut de Macara y Azuay?", espera: ["macara", "azuay"] },
  { id: 29, fase: "Sucursales", q: "Donde queda Rocafrut de Jose Maria Pena?", espera: ["jose maria pena", "mercadillo"] },
  { id: 30, fase: "Sucursales", q: "Donde queda Rocafrut de Romerillos?", espera: ["romerillos", "arupos"] },
  { id: 31, fase: "Sucursales", q: "Donde queda Rocafrut de Arupos?", espera: ["arupos", "romerillos"] },
  { id: 32, fase: "Sucursales", q: "Cual es la sucursal mas cercana al centro de Loja?", espera: ["centro", "18 de noviembre", "macara"] },
  { id: 33, fase: "Sucursales", q: "Cual esta mas cerca de Las Pitas o Terminal?", espera: ["8 de diciembre", "pitas"] },
  { id: 34, fase: "Sucursales", q: "Tienen una sucursal en Catamayo?", espera: ["si", "catamayo", "isidro ayora"] },
  { id: 35, fase: "Sucursales", q: "Tienen una sucursal en Machala?", espera: ["si", "machala", "tarqui"] },
  { id: 36, fase: "Sucursales", q: "Tienen locales fuera de Loja?", espera: ["catamayo", "machala"] },
  { id: 37, fase: "Sucursales", q: "Cual es la direccion exacta de la matriz?", espera: ["ancon", "gran colombia"] },
  { id: 38, fase: "Sucursales", q: "Tienen sucursal en Cuenca actualmente?", espera: ["cerrado", "no", "tenderito"] },
  { id: 39, fase: "Sucursales", q: "Tienen sucursal en Quito o Guayaquil?", espera: ["no", "loja", "catamayo", "machala"] },
  // FASE 2B: Horarios
  { id: 40, fase: "Horarios", q: "A que hora abre Zerimar?", espera: ["09:00", "08:30", "manana"] },
  { id: 41, fase: "Horarios", q: "A que hora cierra Zerimar?", espera: ["21:00", "21:15", "21:30", "noche"] },
  { id: 42, fase: "Horarios", q: "Esta abierto Zerimar hoy?", espera: ["abierto", "abiertas", "horario", "lunes", "domingo"] },
  { id: 43, fase: "Horarios", q: "A que hora abre Rocafrut Macara?", espera: ["08:00", "manana"] },
  { id: 44, fase: "Horarios", q: "A que hora cierra Rocafrut Macara?", espera: ["23:00", "21:00", "noche"] },
  { id: 45, fase: "Horarios", q: "Abren los domingos?", espera: ["si", "domingo", "abierto"] },
  { id: 46, fase: "Horarios", q: "Atienden 24 horas?", espera: ["no", "24"] },
  { id: 47, fase: "Horarios", q: "Cual es el horario de la matriz?", espera: ["09:00", "21:15", "horario", "atiende", "9 de la", "21"] },
  { id: 48, fase: "Horarios", q: "Cual es el horario de Zerimar Machala?", espera: ["09:00", "20:30", "horario"] },
  // FASE 3: Productos
  { id: 49, fase: "Productos", q: "Tienen arroz?", espera: ["arroz", "disponible", "precio", "no encontre", "si"] },
  { id: 50, fase: "Productos", q: "Cuanto cuesta el aceite?", espera: ["aceite", "precio", "$", "asesor", "disponible"] },
  { id: 51, fase: "Productos", q: "Tienen frutas frescas?", espera: ["rocafrut", "fruta", "verdura", "si"] },
  { id: 52, fase: "Productos", q: "Que carnes venden?", espera: ["carne", "res", "cerdo", "pollo", "embutido"] },
  { id: 53, fase: "Productos", q: "Venden electrodomesticos?", espera: ["electrodomestico", "zerimar", "si", "bazar", "hogar"] },
  { id: 54, fase: "Productos", q: "Tienen panaderia?", espera: ["panaderia", "pan", "reposteria", "si"] },
  { id: 55, fase: "Productos", q: "Venden herramientas?", espera: ["ferrimar", "ferreteria", "herramienta", "taladro"] },
  { id: 56, fase: "Productos", q: "Tienen lacteos?", espera: ["lacteo", "leche", "queso", "si", "disponible"] },
  { id: 57, fase: "Productos", q: "Cuanto cuesta una libra de carne de res?", espera: ["martes", "precio", "$", "asesor", "no encontre"] },
  { id: 58, fase: "Productos", q: "Tienen descuento en frutas?", espera: ["jueves", "10%", "rocafrut", "descuento"] },
  // FASE 4: Promociones
  { id: 59, fase: "Promociones", q: "Tienen alguna promo hoy?", espera: ["martes", "miercoles", "jueves", "viernes", "descuento", "promo"] },
  { id: 60, fase: "Promociones", q: "Cual es la promo del Martes Rojo?", espera: ["martes", "5%", "carne", "res", "cerdo"] },
  { id: 61, fase: "Promociones", q: "Que descuento hay en pollo?", espera: ["miercoles", "10%", "pollo"] },
  { id: 62, fase: "Promociones", q: "Tienen descuento en licores?", espera: ["viernes", "5%", "licor"] },
  { id: 63, fase: "Promociones", q: "Cuando es el Martes Rojo?", espera: ["martes", "carne", "descuento", "rojo"] },
  { id: 64, fase: "Promociones", q: "Hay promo en frutas y verduras?", espera: ["jueves", "10%", "fruta", "verdura", "rocafrut"] },
  // FASE 5: Servicios
  { id: 65, fase: "Servicios", q: "Hacen delivery a domicilio?", espera: ["no", "delivery", "domicilio", "asesor"] },
  { id: 66, fase: "Servicios", q: "Aceptan tarjeta de credito?", espera: ["si", "visa", "mastercard", "tarjeta"] },
  { id: 67, fase: "Servicios", q: "Dan factura?", espera: ["si", "factura", "ruc", "cedula", "electronica"] },
  { id: 68, fase: "Servicios", q: "Como puedo postular a un trabajo?", espera: ["hoja de vida", "contabilidad@zerimar", "sucursal", "correo"] },
  { id: 69, fase: "Servicios", q: "Cual es el correo de Zerimar?", espera: ["contabilidad@zerimar.com.ec"] },
  { id: 70, fase: "Servicios", q: "Cual es el telefono de la empresa?", espera: ["258-8083", "07 258", "258"] },
  // FASE 6: Anti-alucinacion
  { id: 71, fase: "Anti-aluc", q: "Cuanto cuesta el iPhone 15 en Zerimar?", espera: ["no", "asesor", "no encontre", "no tenemos", "no disponible"] },
  { id: 72, fase: "Anti-aluc", q: "Tienen sucursal en Ambato?", espera: ["no", "ambato", "loja", "catamayo", "machala"], noQuiero: ["si, en ambato"] },
  { id: 73, fase: "Anti-aluc", q: "Cual es el RUC de Zerimar?", espera: ["1191729486001"] },
  { id: 74, fase: "Anti-aluc", q: "Desde cuando existe Zerimar?", espera: ["1995", "2009"] },
  { id: 75, fase: "Anti-aluc", q: "Tienen pizza?", espera: ["no", "pizza", "panaderia", "asesor"] },
  // FASE 7: Escalado
  { id: 76, fase: "Escalado", q: "Quiero hablar con un asesor", espera: ["asesor", "humano", "comparto", "escribiran"] },
  { id: 77, fase: "Escalado", q: "Quiero hacer una queja", espera: ["asesor", "queja", "humano", "disculpa"] },
  { id: 78, fase: "Escalado", q: "Puedo devolver un producto que compre?", espera: ["asesor", "devolucion", "humano"] },
  { id: 79, fase: "Escalado", q: "Necesito una cotizacion al por mayor de arroz", espera: ["asesor", "mayor", "cotizacion"] },
  // FASE 8: Identidad
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
  console.log("SUITE COMPLETA -- Fases 2-8 (Casos 21-84)");
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

    const ing = await ingresar({
      jid: telefono,
      nombre: "Tester QA Suite",
      texto: caso.q,
    });

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
      const motivo =
        aciertos.length === 0
          ? `no encontro: [${caso.espera.join(", ")}]`
          : `prohibido: [${violaciones.join(", ")}]`;
      console.log(`[FAIL] [${caso.id}] ${caso.q}`);
      console.log(`     Bot: "${respuestaRaw.replace(/\n/g, " ").slice(0, 110)}"`);
      console.log(`     >> ${motivo}`);
      fallidosDetalle.push(`[${caso.id}] ${caso.q} => ${motivo}`);
    }

    await limpiarConversacion(ing.conversacionId);
    await new Promise((r) => setTimeout(r, 2200));
  }

  console.log("\n=========================================================");
  console.log(`RESULTADO FINAL: ${aprobadas}/${CASOS.length} OK | ${fallidas} FAIL`);
  const pct = Math.round((aprobadas / CASOS.length) * 100);
  console.log(`Tasa de exito: ${pct}% ${pct >= 90 ? "[VERDE]" : pct >= 70 ? "[AMARILLO]" : "[ROJO]"}`);
  if (fallidosDetalle.length) {
    console.log("\nResumen de fallos:");
    fallidosDetalle.forEach((d) => console.log("  -", d));
  } else {
    console.log("\nTodas las pruebas pasaron!");
  }
  console.log("=========================================================");
  process.exit(0);
}

testear().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
