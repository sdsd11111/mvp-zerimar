import { NextResponse } from "next/server";
import { q, exec } from "@/lib/db";
import { enviarTexto } from "@/lib/evolution";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: P) {
  const id = Number((await params).id);
  const [conv] = await q<any>(
    `SELECT c.*, ct.nombre, ct.telefono, ct.datos FROM bot_conversaciones c JOIN bot_contactos ct ON ct.id=c.contacto_id WHERE c.id=?`, [id]);
  if (!conv) return NextResponse.json({ error: "no existe" }, { status: 404 });
  const mensajes = (await q("SELECT id, rol, texto, creado_en FROM bot_mensajes WHERE conversacion_id=? ORDER BY id DESC LIMIT 200", [id])).reverse();
  const trazas = await q("SELECT id, tools_llamadas, bloqueada, latencia_ms, tokens, creado_en FROM bot_trazas WHERE conversacion_id=? ORDER BY id DESC LIMIT 8", [id]);
  return NextResponse.json({ conv, mensajes, trazas });
}

export async function POST(req: Request, { params }: P) {
  const id = Number((await params).id);
  const { accion, texto } = await req.json();

  if (accion === "tomar") {
    await exec("UPDATE bot_conversaciones SET bot_activo=0, estado='HUMANO', asignado_a='Asesor' WHERE id=?", [id]);
    await exec("INSERT INTO bot_eventos (conversacion_id, tipo) VALUES (?, 'tomado')", [id]);
  } else if (accion === "devolver") {
    await exec("UPDATE bot_conversaciones SET bot_activo=1, estado='ATENDIENDO', asignado_a=NULL, intentos_fallidos=0 WHERE id=?", [id]);
    await exec("INSERT INTO bot_eventos (conversacion_id, tipo) VALUES (?, 'reactivado')", [id]);
  } else if (accion === "enviar" && texto?.trim()) {
    const [c] = await q<any>("SELECT ct.telefono AS jid FROM bot_conversaciones cv JOIN bot_contactos ct ON ct.id=cv.contacto_id WHERE cv.id=?", [id]);
    if (!c) return NextResponse.json({ error: "no existe" }, { status: 404 });
    try { await enviarTexto(c.jid, texto.trim()); }
    catch (e: any) { return NextResponse.json({ error: e.message }, { status: 502 }); }
    await exec("INSERT INTO bot_mensajes (conversacion_id, rol, texto) VALUES (?, 'agente', ?)", [id, texto.trim()]);
    await exec("UPDATE bot_conversaciones SET bot_activo=0, estado='HUMANO', ultimo_msg_en=NOW(3) WHERE id=?", [id]);
  } else return NextResponse.json({ error: "acción inválida" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
