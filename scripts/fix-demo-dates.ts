import { config } from "dotenv";
config({ path: ".env.local" });
import { q, exec } from "../lib/db";

async function fixDemoDates() {
  console.log("Ajustando fechas de datos demo...");
  // Los chats demo tienen telefono LIKE 'demo-%'
  // Vamos a ajustar sus fechas para que comiencen hace al menos 2 horas o días atrás,
  // y que ninguna fecha demo esté en el futuro ni supere la hora actual de WhatsApp.
  
  // Obtenemos la hora actual del servidor MySQL
  const [nowRow] = await q<any>("SELECT NOW() as ahora");
  const ahora = new Date(nowRow.ahora);
  console.log("Hora DB actual:", ahora.toISOString());

  // Obtenemos los demo
  const demos = await q<any>(`
    SELECT c.id, c.ultimo_msg_en 
    FROM bot_conversaciones c 
    JOIN bot_contactos ct ON ct.id=c.contacto_id 
    WHERE ct.telefono LIKE 'demo-%'
  `);

  console.log(`Encontradas ${demos.length} conversaciones demo.`);

  for (const d of demos) {
    // Calculamos una fecha entre 1 hora atrás y 6 días atrás
    // Para que los datos del dashboard sigan teniendo historial de 7 días
    // pero NUNCA queden por encima de la hora actual en tiempo real
    const offsetHoras = Math.floor(Math.random() * (24 * 6)) + 2; // entre 2 y 146 horas en el pasado
    const nuevaFecha = new Date(ahora.getTime() - offsetHoras * 3600 * 1000);

    await exec(
      `UPDATE bot_conversaciones SET creado_en = ?, ultimo_msg_en = ? WHERE id = ?`,
      [nuevaFecha, nuevaFecha, d.id]
    );
    await exec(
      `UPDATE bot_mensajes SET creado_en = ? WHERE conversacion_id = ?`,
      [nuevaFecha, d.id]
    );
  }

  console.log("✅ Fechas demo ajustadas exitosamente al pasado.");
  
  // Verificamos el top 5 ahora
  const top = await q<any>(`
    SELECT c.id, c.ultimo_msg_en, ct.nombre, ct.telefono 
    FROM bot_conversaciones c 
    JOIN bot_contactos ct ON ct.id=c.contacto_id 
    ORDER BY c.ultimo_msg_en DESC LIMIT 5
  `);
  console.log("NUEVO TOP 5:", JSON.stringify(top, null, 2));

  process.exit(0);
}

fixDemoDates().catch(err => {
  console.error(err);
  process.exit(1);
});
