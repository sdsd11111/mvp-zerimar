// Envia texto por WhatsApp via Evolution API (v2). Los jid "sim-..." son chats de prueba.
export async function enviarTexto(jid: string, texto: string) {
  if (jid.startsWith("sim-")) return;
  try {
    const r = await fetch(`${process.env.EVOLUTION_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ number: jid, text: texto, delay: 1200 }), // delay = "escribiendo..."
    });
    if (!r.ok) {
      console.warn(`[Evolution Warning] ${r.status}: ${await r.text()}`);
    }
  } catch (err: any) {
    console.warn(`[Evolution Error] No se pudo enviar WhatsApp a ${jid}:`, err?.message || err);
  }
}
