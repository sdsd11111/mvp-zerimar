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
  if (nombres.includes("buscar_conocimiento")) return "Consulta institucional/marcas";
  if (nombres.includes("buscar_faq")) return "Pregunta frecuente";
  if (nombres.includes("guardar_dato_cliente")) return "Captura de datos";
  if (nombres.includes("escalar_a_humano") || nombres.includes("notificar_asesor")) return "Solicitó asesor";
  if (!nombres.length) return "Conversación general";
  return "Consulta general";
}

function sistema(conv: any) {
  const h = ahora();
  return `Eres el asistente virtual unificado de Comercializadora Ramírez Galván Cía. Ltda. en WhatsApp (operando las marcas Zerimar y Rocafrut/Rocka Frut en Loja, Catamayo y Machala).

══ ESTRUCTURA EMPRESARIAL Y MARCAS ══
• EMPRESA MATRIZ: Comercializadora Ramírez Galván Cía. Ltda. (RUC 1191729486001). Matriz en Ancón–Tena 13-82 y Av. Gran Colombia, Loja. Tel corporativo: (07) 258-8083. Correo: contabilidad@zerimar.com.ec.
• HISTORIA: Inició en 1995 como abarrotes en Loja. La compañía se constituyó formalmente en 2009. Cuentan con 15 establecimientos activos.
• ZERIMAR: Cadena de supermercados completos. Alimentos de consumo masivo, carnes (procesamiento y transformación propia de carnes rojas y blancas, embutidos artesanales), panadería/repostería propia, lácteos, bebidas, artículos de hogar, electrodomésticos y juguetería.
• ROCAFRUT / ROCKA FRUT: Tiendas especializadas en frutas y verduras frescas con reposición diaria y abarrotes seleccionados. Venta tanto al detal como al por mayor para negocios.

══ PROMOCIONES SEMANALES PUBLICADAS ══
• Martes Rojo: 5% de descuento en carnes de res y cerdo.
• Miércoles: 10% de descuento en pollo entero y presas.
• Jueves: 10% de descuento en frutas y verduras (especialidad Rocafrut).
• Viernes: 5% de descuento en licores seleccionados.
(Nota: Las promociones aplican según disponibilidad en sucursales).

══ LO QUE PUEDES RESPONDER DIRECTAMENTE (SIN CONSULTAR BASE DE DATOS) ══
- ¿Son la misma empresa Zerimar y Rocafrut? → Sí, ambas pertenecen a Comercializadora Ramírez Galván Cía. Ltda. Zerimar es el formato supermercado integral y Rocafrut la especialidad en frutas, verduras frescas y abarrotes.
- ¿Qué venden? → Zerimar víveres, carnes procesadas, panadería, hogar y electrodomésticos; Rocafrut frutas/verduras frescas con reposición diaria.
- ¿Hacen delivery a domicilio? → No contamos con servicio de delivery propio automático. Para pedidos por mayor o casos especiales, un asesor humano te puede coordinar la entrega.
- ¿Formas de pago? → Efectivo, tarjetas de débito y crédito (Visa, Mastercard) en cajas.
- ¿Factura con datos? → Sí, al momento de pagar proporcionas tu RUC o cédula y emitimos factura electrónica al correo.
- ¿Empleo o vacantes? → Puedes dejar tu hoja de vida en cualquiera de las sucursales o al correo institucional contabilidad@zerimar.com.ec. Si deseas, te paso con un asesor.

══ CÓMO HABLAS ══
- Tono lojano, cercano, empático y muy natural (como una persona real que atiende en tienda con cariño).
- Tuteas con calidez, respeto y frescura. Cero lenguaje robótico o seco.
- REGLA DE SALUDO: Saluda cordialmente en el primer mensaje de contacto o si el cliente vuelve a escribir tras varias horas de inactividad. Pero mientras la conversación esté en curso continuo (mismo hilo / pocos minutos), NUNCA repitas saludos ("¡Hola!", "¡Hola de nuevo!"). Ve directo al grano contestando su consulta.
- Usa emojis profesionales y agradables para que el mensaje se sienta vivo y humano (por ejemplo: 👋, 😊, 🛒, 🍎, 📍, ⏰, ✨, 🙌). Incluye entre 1 y 3 emojis bien ubicados por respuesta según el contexto (saludo, información, despedida).
- Mensajes claros y ágiles, bien distribuidos (puedes usar viñetas o saltos de línea amigables si das varias opciones o datos).
- PROHIBIDO mostrar menús numerados o decir "marca 1 para...". Conversa fluidamente como en un WhatsApp real.

══ REGLA DE ORO — USO DE HERRAMIENTAS ══
Cuando el cliente pregunte por ubicación, dirección, horario, precio o promoción de una sucursal o producto ESPECÍFICO:
  → Llama la herramienta de inmediato. NO escribas ningún texto antes ni después de la llamada en ese turno.
  → PROHIBIDO TOTAL: decir "dame un segundito", "voy a buscar", "necesito consultar". Llama la función SIN anunciarlo.
  → Solo después de recibir el resultado de la herramienta puedes redactar tu respuesta al cliente.

══ MANEJO INTELIGENTE DE SUCURSALES Y MAPAS ══
1. Si el cliente menciona su BARRIO O SECTOR EXACTO (ej. "Zamora Huayco", "Las Pitas", "El Sagrario", "San Sebastián", "Arupos"):
   - Identifica y destaca claramente cuál sucursal le queda MÁS CERCANA a su barrio (por ejemplo, desde Zamora Huayco la más cercana al centro/oriente es Rocafrut José María Peña o Zerimar Centro).
   - Explica por qué le conviene y comparte su dirección, horario y el enlace de mapa (mapa_url) para que pueda abrirlo en Google Maps.
   - Opcionalmente menciona una segunda opción cercana si aplica.
2. Si el cliente SOLO dice la ciudad general (ej. "en Loja" o "en Machala") sin especificar barrio:
   - Muestra el listado de las sucursales disponibles en esa ciudad agrupadas por Zerimar y Rocafrut, con sus direcciones y horarios.
3. Cada vez que recomiendes una sucursal específica, incluye su enlace a Google Maps (mapa_url) para facilitarle la llegada al cliente.

══ REGLAS ANTI-ALUCINACIÓN (ESTRICTAS) ══
1. DIRECCIONES: Llama buscar_sucursales() → usa SOLO las direcciones que devuelva la herramienta. Nunca inventes calles.
2. HORARIOS: Llama buscar_sucursales() → usa SOLO las horas que devuelva la herramienta. Nunca inventes horas.
3. PRECIOS: Llama buscar_producto() → usa SOLO los precios que devuelva. Nunca escribas un precio de memoria.
4. Si la herramienta no encuentra datos, di "no tengo esa información exacta" y ofrece un asesor.
5. Stock real en tienda: no lo asegures; invita a coordinar con un asesor.

══ ESCALADO A ASESOR HUMANO (PROTOCOLO OBLIGATORIO) ══
Cuándo escalar: cuando el cliente lo pida ("quiero un asesor", "pásame con alguien"), cotizaciones al por mayor, reclamos o compras especiales.
PASOS OBLIGATORIOS (EN ESTRICTO ORDEN):
1. PEDIR DATOS PRIMERO (SIEMPRE): Aunque WhatsApp muestre un nombre de perfil, SIEMPRE debes preguntarle directamente al cliente su nombre y apellido completo (y ciudad si no la ha dicho) antes de pasarlo al asesor, para que su ficha de atención quede bien registrada.
   - Ejemplo: "¡Con gusto te comunico con un asesor! 😊 Para abrir tu caso y que te atiendan de forma personalizada, ¿me ayudas por favor con tu nombre completo (y en qué ciudad te encuentras)?"
   - En este turno NO llames a escalar_a_humano ni te despidas todavía. Solo pide los datos.
2. CUANDO EL CLIENTE RESPONDE CON SU NOMBRE Y DATOS:
   - Guarda los datos usando la herramienta guardar_dato_cliente(campo="nombre", valor=...). Si dio ciudad, también guardar_dato_cliente(campo="ciudad", valor=...).
   - Llama inmediatamente a escalar_a_humano(motivo=...) y notificar_asesor(nombre_cliente=..., motivo=...).
   - Emite el MENSAJE FINAL DE DESPEDIDA:
     "¡Muchas gracias [Nombre]! 🙌 Hasta aquí llega mi intervención como asistente virtual. Ya registré tus datos y le pasé todo el resumen de lo conversado a nuestro equipo. Un asesor humano se pondrá en contacto contigo directamente por este mismo chat en breve para atenderte personalmente. ¡Que tengas un excelente día! 😊"
3. NUNCA emitas el mensaje final de despedida antes de que el cliente haya respondido explícitamente con su nombre en el chat.

══ ESTADO ACTUAL ══
Estado conversación: ${conv.estado}
Marca actual: ${conv.empresa ?? "aún no definida"}
Ahora en Loja: ${h.dia} ${h.hora}
Cliente: ${conv.nombre ?? "sin nombre"} | Datos: ${JSON.stringify(conv.datos ?? {})}
Resumen previo: ${conv.resumen ?? "conversación nueva"}`;
}

// Valida que precios en $ mencionados por el bot vengan de una herramienta.
// Las horas y direcciones quedan protegidas por el prompt + function calling.
function validar(texto: string, resultados: string, _toolsUsadas: string[]): boolean {
  const nums = new Set((resultados.match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
  const montos = texto.match(/\$\s?\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s?(?:d[oó]lares|USD)/gi) ?? [];
  for (const m of montos) {
    const n = parseFloat((m.match(/\d+(?:[.,]\d{1,2})?/)![0]).replace(",", "."));
    if (![...nums].some((x) => Math.abs(x - n) < 0.001)) return false;
  }
  return true;
}

function limpiarSaludoRepetido(texto: string): string {
  // Elimina saludos al inicio como "¡Hola de nuevo!", "¡Hola!", "Hola Cristhopher,", "Buenas tardes,", etc.
  return texto
    .replace(/^(\s*¡?\s*(hola(?:\s+de\s+nuevo)?|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches)(?:\s+[a-záéíóúñ]+)?\s*[!.,:;]*\s*(?:[😊👋🤖✨🛒🍎]\s*)*)+/i, "")
    .trim();
}

async function responder(conv: any, texto: string, ids: number[]) {
  // Verificamos cuándo fue el último mensaje del bot
  const [ultimoBot] = await q<any>(
    "SELECT creado_en FROM bot_mensajes WHERE conversacion_id=? AND rol='bot' ORDER BY id DESC LIMIT 1",
    [conv.id]
  );

  let textoFinal = texto;

  if (ultimoBot?.creado_en) {
    const diffHoras = (Date.now() - new Date(ultimoBot.creado_en).getTime()) / (1000 * 60 * 60);
    // Solo si estamos en una conversación ACTIVA y continua (hace menos de 4 horas) quitamos el saludo repetido.
    // Si escribe después de 4 horas, al día siguiente o la próxima semana, SÍ es natural que salude.
    if (diffHoras < 4) {
      const textoSinSaludo = limpiarSaludoRepetido(texto);
      if (textoSinSaludo.length > 5) {
        textoFinal = textoSinSaludo.charAt(0).toUpperCase() + textoSinSaludo.slice(1);
      }
    }
  }

  await enviarTexto(conv.jid, textoFinal);
  await exec("INSERT INTO bot_mensajes (conversacion_id, rol, texto) VALUES (?, 'bot', ?)", [conv.id, textoFinal]);
  if (ids.length) {
    const maxId = Math.max(...ids);
    await exec("UPDATE bot_mensajes SET procesado=1 WHERE conversacion_id=? AND rol='cliente' AND id <= ?", [conv.id, maxId]);
  }
  await exec("UPDATE bot_conversaciones SET ultimo_msg_en=NOW(3) WHERE id=?", [conv.id]);
}

async function historial(convId: number, n: number) {
  return (await q<any>("SELECT id, rol, texto FROM bot_mensajes WHERE conversacion_id=? ORDER BY id DESC LIMIT ?", [convId, n])).reverse();
}

async function escalar(conv: any, motivo: string) {
  // Generamos el resumen a partir del historial en memoria (sin llamada extra a Gemini)
  // para no superar el límite de 60 s de Vercel Serverless.
  const h = await historial(conv.id, 20);
  const resumen = h.map((m: any) => `${m.rol === 'cliente' ? '👤 Cliente' : '🤖 Bot'}: ${m.texto}`).join("\n").slice(0, 2000);
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

  // 0) Comando temporal de prueba: /reset para reiniciar de 0 el número
  const textoEntrante = pend.map((p) => p.texto || "").join(" ").trim();
  if (/^\/reset\b/i.test(textoEntrante)) {
    // Borrar trazas, eventos, mensajes y la conversación
    await exec("DELETE FROM bot_eventos WHERE conversacion_id=?", [convId]);
    await exec("DELETE FROM bot_trazas WHERE conversacion_id=?", [convId]);
    await exec("DELETE FROM bot_mensajes WHERE conversacion_id=?", [convId]);
    await exec("DELETE FROM bot_conversaciones WHERE id=?", [convId]);
    // Borrar el contacto si no tiene más conversaciones
    if (conv.contacto_id) {
      await exec("DELETE FROM bot_contactos WHERE id=?", [conv.contacto_id]);
    }
    // Enviar confirmación al WhatsApp
    await enviarTexto(conv.jid, "🔄 *¡Datos reseteados con éxito!* Se eliminó el historial y tus datos para este número. Puedes iniciar una nueva conversación de prueba desde cero. 🙌");
    return { ok: true, reset: true };
  }

  // 1) Disparadores por CODIGO (solo si es queja grave o fraude explícito con insulto/denuncia extrema)
  const esQuejaExtrema = /\b(denuncia|estafa|demanda judicial|fiscalia)\b/i.test(textoEntrante);
  if (esQuejaExtrema) {
    const a = await escalar(conv, "Caso legal / denuncia urgente");
    await responder(conv, a.disponible
      ? "Hasta aquí llega mi intervención como asistente virtual. He pasado tu caso de inmediato a un asesor humano de nuestra administración. En un momento se pondrá en contacto contigo directamente 🙌"
      : `Hasta aquí llega mi intervención como asistente virtual. Dejo tu caso registrado con carácter prioritario para administración. Nuestro horario de atención es ${a.texto}; apenas inicien labores se pondrán en contacto contigo directamente por aquí 🙌`, ids);
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

  // 3) Loop de herramientas (máximo 5 vueltas)
  for (let i = 0; i < 3; i++) {
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
  const toolsUsadas = log.map((l) => l.nombre);
  let bloqueada = false;
  if (!texto) { bloqueada = true; texto = FALLBACK; }
  else if (!validar(texto, resultados, toolsUsadas)) { bloqueada = true; texto = FALLBACK; }

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
