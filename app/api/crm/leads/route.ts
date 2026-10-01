import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Leads: contactos con datos capturados + su última conversación
  const leads = await q<any>(`
    SELECT
      ct.id,
      ct.telefono,
      ct.nombre,
      ct.datos,
      ct.creado_en,
      c.empresa,
      c.intencion,
      c.estado,
      c.bot_activo,
      c.ultimo_msg_en,
      c.motivo_escalamiento
    FROM bot_contactos ct
    LEFT JOIN bot_conversaciones c ON c.id = (
      SELECT id FROM bot_conversaciones WHERE contacto_id = ct.id ORDER BY id DESC LIMIT 1
    )
    WHERE
      ct.nombre IS NOT NULL
      OR (ct.datos IS NOT NULL AND ct.datos != 'null' AND ct.datos != '{}')
    ORDER BY ct.creado_en DESC
    LIMIT 200
  `);

  return NextResponse.json({ leads });
}
