import { q, exec } from "./db";
import { generar, textoDe, type Content } from "./gemini";
import { declaraciones, ejecutar, type Ctx } from "./tools";
import { ahora, asesoresDisponibles } from "./time";
import { enviarTexto } from "./evolution";

const ESCALAR_RE = /\b(asesor|humano|persona real|hablar con alguien|agente|queja|reclam|denuncia|estafa|reembols|devoluci)/i;
const FALLBACK = "Prefiero confirmarlo con un asesor para no darte un dato incorrecto. Ya te paso con uno 🙏";

// Convierte los nombres de tools en una etiqueta legible de intención
function etiquetaIntencion(log: { nombre: string }[], escalado: boolean, bloqueada: boolean): string {
  if (escalado) return "Pasó a asesor";
  if (bloqueada) return "Respuesta bloqueada";
  const nombres = [...new Set(log.map((l) => l.nombre))];
  if (nombres.includes("buscar_producto")) return "Consulta de producto/precio";
  if (nombres.includes("buscar_sucursales")) return "Consulta de sucursal/horario";
  if (nombres.includes("listar_promociones")) return "Consulta de promociones";
  if (nombres.includes("buscar_faq")) return "Pregunta frecuente";
  if (nombres.includes("guardar_dato_cliente")) return "Captura de datos";
  if (nombres.includes("escalar_a_humano") || nombres.includes("notificar_asesor")) return "Solicitó asesor";
  if (!nombres.length) return "Conversación general";
  return "Consulta general";
}

function sistema(conv: any) {
  const h = ahora();
  return `Eres el asistente virtual de Zerimar y Rocafrut en WhatsApp, en Loja, Ecuador.

══ SOBRE LAS EMPRESAS ══
• ZERIMAR: supermercado y comercializadora. Vende víveres, productos de hogar, electrodomésticos, panadería artesanal, lácteos, carnes, embutidos, bebidas, limpieza, higiene personal.
• ROCAFRUT: especialista en frutas, verduras frescas y abarrotes. Producto fresco repuesto diariamente. También vende al por mayor para negocios.

══ LO QUE PUEDES RESPONDER SIN HERRAMIENTA ══
Responde directamente estas preguntas (ya lo sabes):
- ¿Qué vende Zerimar? → Supermercado completo: víveres, hogar, electrodomésticos, panadería, carnes, lácteos, bebidas, higiene, limpieza.
- ¿Qué vende Rocafrut? → Frutas, verduras frescas, abarrotes. Repone producto a diario.
- ¿Trabajan con domicilio/delivery? → No tenemos servicio de delivery propio. Para pedidos especiales o por mayor, un asesor puede ayudarte.
- ¿Puedo pagar con tarjeta? → Sí, aceptamos efectivo, tarjeta de débito y crédito (Visa, Mastercard) en nuestras sucursales.
- ¿Tienen factura electrónica? → Sí, al comprar pide tu RUC/cédula y emitimos factura electrónica.
- ¿Tienen empleo disponible? → Para trabajo, puedes dejar tu CV en cualquier sucursal o enviarlo a nuestro correo. ¿Prefiero pasarte con alguien para darte el correo?
- ¿Cuándo llega la fruta fresca? → La fruta y verdura en Rocafrut se repone a diario.

══ CÓMO HABLAS ══
- Como una persona cercana y amable de la zona. Tuteas. Mensajes cortos (máximo 4 líneas).
- Sin menús numerados. Sin listas de opciones con números o letras. Sin "elige una opción".
- Sin repetir saludos. Un emoji solo cuando suma, no por costumbre.
- Responde directamente lo que preguntaron. Si necesitas más datos, pide solo lo indispensable.

══ REGLAS ANTI-ALUCINACIÓN (no negociables) ══
1. Precios, horarios, direcciones y promociones → SIEMPRE de una herramienta en este turno. Nunca de memoria.
2. Si una herramienta no encuentra nada → admítelo con honestidad, no improvises alternativas.
3. No prometas stock exacto, reservas ni plazos de entrega.

══ ESCALADO A ASESOR ══
Cuándo escalar: el cliente pide hablar con alguien, cotizaciones al por mayor, reclamos, devoluciones, casos que no puedas resolver.

Flujo OBLIGATORIO antes de llamar escalar_a_humano:
PASO 1 → Si no sabes el nombre del cliente, pregúntalo en UN solo mensaje natural: "¿Me das tu nombre para pasarte?"
PASO 2 → Si no sabes el motivo claro, pregunta: "¿Y me cuentas brevemente en qué te podemos ayudar?"
PASO 3 → Cuando tengas nombre Y motivo: llama escalar_a_humano(motivo=...) + luego llama notificar_asesor(nombre_cliente=..., motivo=...).
PASO 4 → Despídete con calidez: "Listo [nombre], ya le avisé al asesor con tu información. En breve te contacta por aquí 🙌"

Si ya tienes el nombre guardado en los datos del cliente, no lo vuelvas a preguntar.

══ ESTADO ACTUAL ══
Estado conversación: ${conv.estado}
Marca actual: ${conv.empresa ?? "aún no definida"}
Ahora en Loja: ${h.dia} ${h.hora}
Cliente: ${conv.nombre ?? "sin nombre"} | Datos: ${JSON.stringify(conv.datos ?? {})}
Resumen previo: ${conv.resumen ?? "conversación nueva"}`;
}

// Bloquea cifras u horarios que NO vinieron de una herramienta este turno.
function validar(texto: string, resultados: string): boolean {
  const nums = new Set((resultados.match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
  const montos = texto.match(/\$\s?\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s?(?:d[oó]lares|USD)/gi) ?? [];
  for (const m of montos) {
    const n = parseFloat((m.match(/\d+(?:[.,]\d{1,2})?/)![0]).replace(",", "."));
    if (![...nums].some((x) => Math.abs(x - n) < 0.001)) return false;
  }
  const fix = (s: string) => s.replace(/\b(\d):/, "0$1:");
  const horasOk = (resultados.match(/\b\d{1,2}:\d{2}\b/g) ?? []).map(fix);
  for (const h of (texto.match(/\b\d{1,2}:\d{2}\b/g) ?? []).map(fix)) if (!horasOk.includes(h)) return false;
  return true;
}

async function responder(conv: any, texto: string, ids: number[]) {
  await enviarTexto(conv.jid, texto);
  await exec("INSERT INTO bot_mensajes (conversacion_id, rol, texto) VALUES (?, 'bot', ?)", [conv.id, texto]);
  if (ids.length) await exec("UPDATE bot_mensajes SET procesado=1 WHERE id IN (?)", [ids]);
  await exec("UPDATE bot_conversaciones SET ultimo_msg_en=NOW(3) WHERE id=?", [conv.id]);
}

async function historial(convId: number, n: number) {
  return (await q<any>("SELECT id, rol, texto FROM bot_mensajes WHERE conversacion_id=? ORDER BY id DESC LIMIT ?", [convId, n])).reverse();
}

async function escalar(conv: any, motivo: string) {
  let resumen = "No se pudo generar el resumen; revisa el historial.";
  try {
    const h = await historial(conv.id, 20);
    const conversacion = h.map((m) => `${m.rol}: ${m.texto}`).join("\n");
    const r = await generar({
      contents: [{ role: "user", parts: [{ text:
        `Resume para un asesor humano, en máximo 5 líneas cortas: quién es el cliente, qué quiere, qué ya se le respondió y qué falta resolver. No inventes.\nCliente: ${conv.nombre ?? "sin nombre"} ${JSON.stringify(conv.datos ?? {})}\nResumen previo: ${conv.resumen ?? "ninguno"}\n\nConversación:\n${conversacion}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
    });
    resumen = textoDe(r) || resumen;
  } catch { /* se queda el texto por defecto */ }
  await exec("UPDATE bot_conversaciones SET bot_activo=0, estado='ESCALADO', motivo_escalamiento=?, resumen_agente=? WHERE id=?", [motivo, resumen, conv.id]);
  await exec("INSERT INTO bot_eventos (conversacion_id, tipo, detalle) VALUES (?, 'escalado', ?)", [conv.id, JSON.stringify({ motivo })]);
  return asesoresDisponibles();
}

export async function procesarConversacion(convId: number) {
  const [conv] = await q<any>(
    `SELECT c.*, ct.nombre, ct.telefono AS jid, ct.datos FROM bot_conversaciones c JOIN bot_contactos ct ON ct.id=c.contacto_id WHERE c.id=?`, [convId]);
  if (!conv || !conv.bot_activo) return { omitido: "bot inactivo" };
  const pend = await q<any>("SELECT id, texto FROM bot_mensajes WHERE conversacion_id=? AND rol='cliente' AND procesado=0 ORDER BY id", [convId]);
  if (!pend.length) return { omitido: "sin pendientes" };
  const ids: number[] = pend.map((p) => p.id);
  const t0 = Date.now();

  // 1) Disparadores por CODIGO (no dependen del modelo)
  if (ESCALAR_RE.test(pend.map((p) => p.texto).join(" "))) {
    const a = await escalar(conv, "El cliente pidió un asesor o tiene un reclamo");
    await responder(conv, a.disponible
      ? "Claro, te paso con un asesor ahora mismo. Ya le comparto lo que conversamos para que no repitas nada 🙌"
      : `Claro, dejo tu caso listo para un asesor. Ellos atienden ${a.texto}; apenas inicien te escriben por aquí 🙌`, ids);
    return { escalado: true };
  }

  // 2) Contexto: datos + estado + resumen (system) y ultimos 14 mensajes (contents)
  const contents: Content[] = [];
  for (const m of await historial(convId, 14)) {
    const role = m.rol === "cliente" ? "user" : "model";
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n" + m.texto;
    else contents.push({ role, parts: [{ text: m.texto }] });
  }
  while (contents[0]?.role === "model") contents.shift();

  const ctx: Ctx = { convId, contactoId: conv.contacto_id, empresa: conv.empresa };
  const system = sistema(conv);
  const log: { nombre: string; args: any; resultado: any }[] = [];
  let tokens = 0, texto = "";

  // 3) Loop de herramientas (maximo 5 vueltas)
  for (let i = 0; i < 5; i++) {
    const res = await generar({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      tools: [{ functionDeclarations: declaraciones }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    });
    tokens += res?.usageMetadata?.totalTokenCount ?? 0;
    const cand = res?.candidates?.[0];
    const calls = (cand?.content?.parts ?? []).filter((p: any) => p.functionCall);
    if (!calls.length) { texto = textoDe(res); break; }
    contents.push(cand.content); // se conserva tal cual (incluye firmas de pensamiento)
    const respuestas: any[] = [];
    for (const c of calls) {
      const resultado = await ejecutar(c.functionCall.name, c.functionCall.args ?? {}, ctx);
      log.push({ nombre: c.functionCall.name, args: c.functionCall.args ?? {}, resultado });
      respuestas.push({ functionResponse: { name: c.functionCall.name, response: { result: resultado } } });
    }
    contents.push({ role: "user", parts: respuestas });
  }

  // 4) Validacion anti-alucinacion
  const resultados = JSON.stringify(log.map((l) => l.resultado));
  let bloqueada = false;
  if (!texto) { bloqueada = true; texto = FALLBACK; }
  else if (!validar(texto, resultados)) { bloqueada = true; texto = FALLBACK; }

  // 5) Escalado / intentos fallidos
  let motivo = ctx.escalar ?? (bloqueada ? "El bot no pudo dar una respuesta verificable" : null);
  const sinResultado = log.some((l) => l.resultado?.encontrado === false);
  let intentos = sinResultado ? conv.intentos_fallidos + 1 : 0;
  if (!motivo && intentos >= 2) motivo = "El bot no encontró información dos veces seguidas";
  if (motivo) { await escalar(conv, motivo); intentos = 0; }

  await responder(conv, texto, ids);
  await exec("UPDATE bot_conversaciones SET intentos_fallidos=?, estado=IF(?, estado, 'ATENDIENDO') WHERE id=?", [intentos, motivo ? 1 : 0, convId]);

  // Guardar intención detectada
  const intencion = etiquetaIntencion(log, !!motivo, bloqueada);
  await exec("UPDATE bot_conversaciones SET intencion=? WHERE id=?", [intencion, convId]);

  await exec("INSERT INTO bot_trazas (conversacion_id, prompt, respuesta, tools_llamadas, bloqueada, tokens, latencia_ms) VALUES (?,?,?,?,?,?,?)", [
    convId, JSON.stringify({ system, contents }), JSON.stringify({ texto }), JSON.stringify(log), bloqueada ? 1 : 0, tokens, Date.now() - t0,
  ]);

  try { await actualizarResumen(convId); } catch { /* no critico */ }
  return { ok: true, escalado: !!motivo, bloqueada };
}

// Resumen rodante estructurado: comprime lo antiguo para que nunca se pierda.
async function actualizarResumen(convId: number) {
  const [c] = await q<any>("SELECT resumen, resumen_hasta_msg_id FROM bot_conversaciones WHERE id=?", [convId]);
  const desde = c.resumen_hasta_msg_id ?? 0;
  const [{ n }] = await q<any>("SELECT COUNT(*) n FROM bot_mensajes WHERE conversacion_id=? AND id>?", [convId, desde]);
  if (n <= 24) return;
  const viejos = await q<any>("SELECT id, rol, texto FROM bot_mensajes WHERE conversacion_id=? AND id>? ORDER BY id LIMIT ?", [convId, desde, n - 10]);
  const r = await generar({
    contents: [{ role: "user", parts: [{ text:
      `Actualiza el resumen de esta conversación de atención al cliente. Responde SOLO un JSON con las claves: quiere, ya_se_le_dijo, datos, pendiente. Sé breve y no inventes.\nResumen previo: ${c.resumen ?? "ninguno"}\n\nMensajes nuevos:\n${viejos.map((m: any) => `${m.rol}: ${m.texto}`).join("\n")}` }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
  });
  const t = textoDe(r).replace(/```json|```/g, "").trim();
  if (!t) return;
  await exec("UPDATE bot_conversaciones SET resumen=?, resumen_hasta_msg_id=? WHERE id=?", [t, viejos[viejos.length - 1].id, convId]);
}
