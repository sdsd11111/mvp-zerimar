import { q, exec } from "./db";

type Entrada = { jid: string; nombre?: string | null; texto: string; waId?: string | null; procesado?: boolean };

// Guarda el mensaje del cliente. Deduplica por wa_message_id (UNIQUE).
export async function ingresar(e: Entrada) {
  await exec("INSERT INTO bot_contactos (telefono, nombre) VALUES (?, ?) ON DUPLICATE KEY UPDATE nombre=COALESCE(nombre, VALUES(nombre))", [e.jid, e.nombre ?? null]);
  const [ct] = await q<any>("SELECT id FROM bot_contactos WHERE telefono=?", [e.jid]);
  let [cv] = await q<any>("SELECT id, bot_activo, estado, motivo_escalamiento FROM bot_conversaciones WHERE contacto_id=? ORDER BY id DESC LIMIT 1", [ct.id]);
  if (!cv) {
    const r = await exec("INSERT INTO bot_conversaciones (contacto_id) VALUES (?)", [ct.id]);
    cv = { id: r.insertId, bot_activo: 1, estado: "NUEVO", motivo_escalamiento: null };
  }
  try {
    await exec("INSERT INTO bot_mensajes (conversacion_id, rol, texto, wa_message_id, procesado) VALUES (?, 'cliente', ?, ?, ?)", [cv.id, e.texto, e.waId ?? null, e.procesado ? 1 : 0]);
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") return { duplicado: true as const, conversacionId: cv.id as number, botActivo: !!cv.bot_activo, estado: cv.estado as string, motivoEscalamiento: cv.motivo_escalamiento as string | null };
    throw err;
  }
  await exec("UPDATE bot_conversaciones SET ultimo_msg_en=NOW(3) WHERE id=?", [cv.id]);
  return { duplicado: false as const, conversacionId: cv.id as number, botActivo: !!cv.bot_activo, estado: cv.estado as string, motivoEscalamiento: cv.motivo_escalamiento as string | null };
}
