import { NextResponse } from "next/server";
import { ingresar } from "@/lib/ingest";
import { inngest } from "@/lib/inngest";
import { q } from "@/lib/db";

// Chat de prueba: escribe "como cliente" sin WhatsApp (jid "sim-...").
export async function POST(req: Request) {
  const { texto, conversacionId } = await req.json();
  let jid = `sim-${Date.now().toString(36)}`;
  if (conversacionId) {
    const [c] = await q<any>("SELECT ct.telefono FROM bot_conversaciones cv JOIN bot_contactos ct ON ct.id=cv.contacto_id WHERE cv.id=?", [conversacionId]);
    if (!c?.telefono?.startsWith("sim-")) return NextResponse.json({ error: "solo chats de prueba" }, { status: 400 });
    jid = c.telefono;
  }
  const r = await ingresar({
    jid,
    nombre: conversacionId ? undefined : "Cliente de prueba",
    texto: String(texto ?? "Hola").slice(0, 2000),
  });

  if (r.botActivo) {
    if (!process.env.INNGEST_SIGNING_KEY && !process.env.INNGEST_EVENT_KEY) {
      const { procesarConversacion } = await import("@/lib/bot");
      setTimeout(() => {
        procesarConversacion(r.conversacionId).catch((err) => console.error("Error simulador bot:", err));
      }, 500);
    } else {
      await inngest.send({ name: "chat/mensaje", data: { conversacionId: r.conversacionId } });
    }
  }
  return NextResponse.json({ conversacionId: r.conversacionId });
}
