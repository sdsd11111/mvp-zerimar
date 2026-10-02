import { config } from "dotenv";
config({ path: ".env.local" });
import { q, exec } from "../lib/db";

const INTENCIONES = [
  "Consulta de producto/precio",
  "Consulta de sucursal/horario",
  "Consulta de promociones",
  "Pregunta frecuente",
  "Pasó a asesor",
  "Dato del cliente guardado",
  "Solicitó asesor",
  "Conversación general",
];

const EMPRESAS = ["zerimar", "rocafrut"];

const MENSAJES_POR_INTENCION: Record<string, string[][]> = {
  "Consulta de producto/precio": [
    ["cliente: ¿Cuánto cuesta el pollo?", "bot: El pollo entero está a $3.50/kg en Zerimar 🛒"],
    ["cliente: Tienen leche de medio litro?", "bot: Sí, tenemos leche entera y semidescremada ✨"],
    ["cliente: precio de las manzanas", "bot: Las manzanas rojas están a $2.20/kg en Rocafrut 🍎"],
    ["cliente: ¿cuánto el azúcar?", "bot: El azúcar de 2kg está disponible en Zerimar 😊"],
  ],
  "Consulta de sucursal/horario": [
    ["cliente: ¿a qué hora abren?", "bot: Abrimos de 08:00 a 21:00 de lunes a sábado ⏰"],
    ["cliente: dónde queda Zerimar centro?", "bot: Estamos en Av. Gran Colombia 14-32, Loja 📍"],
    ["cliente: tienen sucursal en Catamayo?", "bot: Sí, tenemos en Catamayo ✨"],
    ["cliente: horario del domingo", "bot: Los domingos abrimos de 09:00 a 18:00 ⏰"],
    ["cliente: dirección de Rocafrut", "bot: Rocafrut está en el centro de Loja 📍"],
  ],
  "Consulta de promociones": [
    ["cliente: ¿tienen promos?", "bot: Sí, los miércoles 10% de descuento en pollo ✨"],
    ["cliente: descuentos de hoy", "bot: Hoy jueves tienes 10% en frutas y verduras 🍎"],
    ["cliente: martes rojo qué es?", "bot: El Martes Rojo: 5% descuento en carnes de res 🛒"],
  ],
  "Pregunta frecuente": [
    ["cliente: hacen delivery?", "bot: No contamos con delivery propio 😊"],
    ["cliente: aceptan tarjeta?", "bot: Sí, aceptamos Visa y Mastercard ✨"],
    ["cliente: hacen factura?", "bot: Sí, emitimos factura electrónica con tu RUC 😊"],
    ["cliente: tienen empleo?", "bot: Puedes dejar tu hoja en cualquier sucursal 🙌"],
  ],
  "Pasó a asesor": [
    ["cliente: quiero hablar con un asesor", "bot: Claro, te paso con un asesor ahora mismo 🙌"],
    ["cliente: tengo una queja", "bot: Hasta aquí llega mi intervención, un asesor te atenderá 🙌"],
  ],
  "Dato del cliente guardado": [
    ["cliente: me llamo Carlos Mora", "bot: Perfecto Carlos, ya registré tu nombre 😊"],
    ["cliente: soy de Catamayo", "bot: Anotado, eres de Catamayo ✨"],
  ],
  "Solicitó asesor": [
    ["cliente: necesito un asesor", "bot: Hasta aquí llega mi intervención, un asesor tomará el chat 🙌"],
    ["cliente: devolución", "bot: Dejo tu caso listo para el asesor 🙌"],
  ],
  "Conversación general": [
    ["cliente: hola", "bot: ¡Hola! 👋 ¿En qué puedo ayudarte hoy?"],
    ["cliente: buenos días", "bot: ¡Buenos días! 😊 ¿Cómo puedo ayudarte?"],
    ["cliente: gracias", "bot: ¡Con gusto! Estoy aquí si necesitas algo más 😊"],
  ],
};

const NOMBRES = [
  "María García", "Juan Pérez", "Ana Torres", "Luis Mendoza", "Carmen Rivas",
  "Pedro Sánchez", "Rosa Jiménez", "Diego Herrera", "Laura Vega", "Marcos Castro",
  "Sofía Delgado", "Pablo Romero", "Valentina Cruz", "José Morales", "Isabel León",
  "Andrés Flores", "Natalia Reyes", "Roberto Silva", "Elena Martínez", "Felipe Ortiz",
  "Gabriela Ruiz", "Santiago Molina", "Patricia Núñez", "Fernando Vargas", "Claudia Ríos",
];

const DISTRIBUCION: [string, number, string][] = [
  // [intencion, cantidad, empresa]
  ["Consulta de producto/precio", 28, "zerimar"],
  ["Consulta de producto/precio", 14, "rocafrut"],
  ["Consulta de sucursal/horario", 22, "zerimar"],
  ["Consulta de sucursal/horario", 10, "rocafrut"],
  ["Consulta de promociones", 18, "zerimar"],
  ["Consulta de promociones", 8, "rocafrut"],
  ["Pregunta frecuente", 15, "zerimar"],
  ["Pregunta frecuente", 6, "rocafrut"],
  ["Pasó a asesor", 9, "zerimar"],
  ["Pasó a asesor", 4, "rocafrut"],
  ["Dato del cliente guardado", 11, "zerimar"],
  ["Dato del cliente guardado", 5, "rocafrut"],
  ["Solicitó asesor", 7, "zerimar"],
  ["Solicitó asesor", 3, "rocafrut"],
  ["Conversación general", 12, "zerimar"],
  ["Conversación general", 5, "rocafrut"],
];

function diasAtras(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));
  return d;
}

async function seedDemoData() {
  // Primero borrar datos demo anteriores (los que empiezan con sim-)
  const convsSim = await q<any>(`
    SELECT c.id, c.contacto_id FROM bot_conversaciones c
    JOIN bot_contactos ct ON ct.id = c.contacto_id
    WHERE ct.telefono LIKE 'demo-%'
  `);
  for (const cv of convsSim) {
    await exec("DELETE FROM bot_eventos WHERE conversacion_id=?", [cv.id]);
    await exec("DELETE FROM bot_trazas WHERE conversacion_id=?", [cv.id]);
    await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [cv.id]);
    await exec("DELETE FROM bot_conversaciones WHERE id=?", [cv.id]);
    await exec("DELETE FROM bot_contactos WHERE id=?", [cv.contacto_id]);
  }
  console.log(`🗑️ Borradas ${convsSim.length} conversaciones demo previas`);

  let totalCreadas = 0;
  let nombreIdx = 0;

  for (const [intencion, cantidad, empresa] of DISTRIBUCION) {
    const mensajesDisp = MENSAJES_POR_INTENCION[intencion] || [["cliente: hola", "bot: ¡Hola! 👋"]];
    
    for (let i = 0; i < cantidad; i++) {
      const nombre = NOMBRES[nombreIdx % NOMBRES.length];
      nombreIdx++;
      const demoPhone = `demo-${intencion.slice(0, 4).replace(/\s/g, "")}-${empresa}-${i}-${Date.now()}`;
      
      // Crear contacto
      const ctRes = await exec("INSERT INTO bot_contactos (telefono, nombre) VALUES (?, ?)", [demoPhone, nombre]);
      const contactoId = ctRes.insertId;
      
      // Determinar días atrás (distribuidos en los últimos 7 días)
      const diasOffset = Math.floor(Math.random() * 7);
      const fechaCreacion = diasAtras(diasOffset);
      
      // Crear conversación
      const esEscalado = intencion === "Pasó a asesor" || intencion === "Solicitó asesor";
      const estado = esEscalado ? "ESCALADO" : "ATENDIENDO";
      const botActivo = esEscalado ? 0 : 1;
      
      const cvRes = await exec(
        `INSERT INTO bot_conversaciones (contacto_id, empresa, estado, bot_activo, intencion, creado_en, ultimo_msg_en) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [contactoId, empresa, estado, botActivo, intencion, fechaCreacion, fechaCreacion]
      );
      const convId = cvRes.insertId;
      
      // Insertar mensajes
      const par = mensajesDisp[i % mensajesDisp.length];
      for (const linea of par) {
        const [rol, ...resto] = linea.split(": ");
        const texto = resto.join(": ");
        const rolDB = rol.trim() === "cliente" ? "cliente" : "bot";
        await exec(
          `INSERT INTO bot_mensajes (conversacion_id, rol, texto, procesado, creado_en) VALUES (?, ?, ?, 1, ?)`,
          [convId, rolDB, texto, fechaCreacion]
        );
      }
      
      totalCreadas++;
    }
  }
  
  console.log(`✅ Creadas ${totalCreadas} conversaciones demo con datos reales de intenciones`);
  console.log("📊 Distribución:");
  for (const [int, n, emp] of DISTRIBUCION) {
    console.log(`   ${emp}: ${n} x "${int}"`);
  }
  process.exit(0);
}

seedDemoData().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
