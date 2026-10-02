import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await q(
    `SELECT c.id, c.empresa, c.estado, c.intencion, c.bot_activo, c.ultimo_msg_en,
      ct.nombre, ct.telefono, ct.datos,
      (SELECT texto FROM bot_mensajes m WHERE m.conversacion_id=c.id ORDER BY m.id DESC LIMIT 1) AS ultimo_texto,
      (SELECT rol FROM bot_mensajes m WHERE m.conversacion_id=c.id ORDER BY m.id DESC LIMIT 1) AS ultimo_rol,
      (SELECT COUNT(*) FROM bot_mensajes m WHERE m.conversacion_id=c.id) AS total_msgs
     FROM bot_conversaciones c JOIN bot_contactos ct ON ct.id=c.contacto_id
     ORDER BY COALESCE(c.ultimo_msg_en, c.creado_en) DESC, c.id DESC LIMIT 100`);
  return NextResponse.json({ items });
}
