import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Métricas generales
  const [stats] = await q<any>(`
    SELECT
      COUNT(*) AS total_conversaciones,
      SUM(bot_activo = 1) AS con_bot,
      SUM(bot_activo = 0 AND estado = 'ESCALADO') AS escaladas,
      SUM(bot_activo = 0 AND estado = 'HUMANO') AS con_humano,
      SUM(DATE(creado_en) = CURDATE()) AS hoy
    FROM bot_conversaciones
  `);

  // Leads: contactos que tienen al menos un dato capturado (nombre, correo, cédula, ciudad)
  const [leads] = await q<any>(`
    SELECT COUNT(*) AS total FROM bot_contactos
    WHERE nombre IS NOT NULL OR (datos IS NOT NULL AND datos != 'null' AND datos != '{}')
  `);

  // Intenciones más frecuentes
  const intenciones = await q<any>(`
    SELECT intencion, COUNT(*) AS n
    FROM bot_conversaciones
    WHERE intencion IS NOT NULL
    GROUP BY intencion
    ORDER BY n DESC
    LIMIT 8
  `);

  // Últimas 7 intenciones únicas (para gráfica simple)
  const porDia = await q<any>(`
    SELECT DATE(creado_en) AS dia, COUNT(*) AS n
    FROM bot_conversaciones
    WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(creado_en)
    ORDER BY dia ASC
  `);

  // Clientes esperando asesor
  const [esperando] = await q<any>(`
    SELECT COUNT(*) AS n FROM bot_conversaciones c
    JOIN bot_mensajes m ON m.conversacion_id = c.id
    WHERE c.bot_activo = 0 AND c.estado NOT IN ('ESCALADO','HUMANO')
    AND m.id = (SELECT MAX(id) FROM bot_mensajes WHERE conversacion_id = c.id)
    AND m.rol = 'cliente'
  `);

  return NextResponse.json({
    stats: { ...stats, leads: leads.total, esperando: esperando.n },
    intenciones,
    porDia,
  });
}
