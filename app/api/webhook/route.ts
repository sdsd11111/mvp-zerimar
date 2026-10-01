import { NextResponse } from "next/server";
import { ingresar } from "@/lib/ingest";
import { inngest } from "@/lib/inngest";
import { enviarTexto } from "@/lib/evolution";
import { exec } from "@/lib/db";

export const maxDuration = 30;

// Evolution -> POST /api/webhook?secret=...   (evento MESSAGES_UPSERT)
// Regla de oro: NO llamar al modelo aqui. Validar, guardar, encolar y responder 200.
export async function POST(req: Request) {
  if (new URL(req.url).searchParams.get("secret") !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const evento = String(body?.event ?? "").toLowerCase().replace("_", ".");
  if (evento !== "messages.upsert") return NextResponse.json({ ok: true });

  const lista = Array.isArray(body.data) ? body.data : [body.data];
  for (const m of lista) {
    const key = m?.key;
    if (!key || key.fromMe) continue; // ignora mis propios mensajes (evita bucles)
    const jid: string = key.remoteJid?.endsWith("@lid") && key.remoteJidAlt ? key.remoteJidAlt : key.remoteJid;
    if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") continue;

    // Filtro temporal para pruebas: si ONLY_PHONE está configurado, solo atiende a ese número
    const onlyPhone = process.env.ONLY_PHONE?.replace(/\D/g, "");
    const numeroRemitente = jid.split("@")[0].replace(/\D/g, "");
    if (onlyPhone && !numeroRemitente.endsWith(onlyPhone.slice(-9))) {
      console.log(`Mensaje ignorado (modo pruebas activo para ${onlyPhone}, recibido de ${numeroRemitente})`);
      continue;
    }

    const texto: string | null =
      m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? m.message?.imageMessage?.caption ?? null;

    const r = await ingresar({
      jid, nombre: m.pushName, waId: key.id,
      texto: texto ?? "[Mensaje no textual: audio, imagen u otro]",
      procesado: !texto,
    });
    if (r.duplicado || !r.botActivo) continue;

    if (!texto) {
      const aviso = "Por ahora solo puedo leer mensajes de texto 🙂 ¿Me lo escribes? Si prefieres, te paso con un asesor.";
      await enviarTexto(jid, aviso);
      await exec("INSERT INTO bot_mensajes (conversacion_id, rol, texto) VALUES (?, 'bot', ?)", [r.conversacionId, aviso]);
    } else {
      if (!process.env.INNGEST_SIGNING_KEY && !process.env.INNGEST_EVENT_KEY) {
        // Modo directo local / MVP: procesar inmediatamente sin depender de daemon de Inngest
        const { procesarConversacion } = await import("@/lib/bot");
        setTimeout(() => {
          procesarConversacion(r.conversacionId).catch((err) => console.error("Error procesando bot directo:", err));
        }, 1000);
      } else {
        await inngest.send({ name: "chat/mensaje", data: { conversacionId: r.conversacionId } });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
