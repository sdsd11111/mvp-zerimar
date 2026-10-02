import { q, exec } from "./db";
import { ahora, asesoresDisponibles } from "./time";

export type Empresa = "zerimar" | "rocafrut";
export type Ctx = { convId: number; contactoId: number; empresa: Empresa | null; escalar?: string };

const EMP = { type: "STRING", enum: ["zerimar", "rocafrut"], description: "Marca. Omitir si no importa." };

export const declaraciones = [
  {
    name: "buscar_sucursales",
    description: "Busca sucursales con dirección, teléfono y horario de atención. Úsala para CUALQUIER pregunta de ubicación u horario.",
    parameters: {
      type: "OBJECT",
      properties: {
        ciudad: { type: "STRING", description: "Ej. Loja, Machala" },
        nombre: { type: "STRING", description: "Parte del nombre o sector, ej. Arupos, 8 de Diciembre, Centro" },
        empresa: EMP,
      },
    },
  },
  {
    name: "listar_promociones",
    description: "Lista las promociones y descuentos vigentes hoy.",
    parameters: { type: "OBJECT", properties: { empresa: EMP } },
  },
  {
    name: "buscar_producto",
    description: "Busca productos por nombre o categoría y devuelve precio y disponibilidad.",
    parameters: {
      type: "OBJECT",
      properties: { texto: { type: "STRING", description: "Producto o categoría, ej. arroz, frutas, licuadora" }, empresa: EMP },
      required: ["texto"],
    },
  },
  {
    name: "buscar_conocimiento",
    description: "Consulta documentos oficiales de la empresa: estructura corporativa (Comercializadora Ramírez Galván), marcas (Zerimar, Rocafrut, Ferrimar, Tenderito), sucursales (15 puntos), historia, pagos, facturación o políticas.",
    parameters: {
      type: "OBJECT",
      properties: {
        tema: {
          type: "STRING",
          enum: ["empresa", "marcas", "sucursales", "politicas_servicios"],
          description: "Tema a consultar: 'empresa' (RUC, directivos, matriz, historia), 'marcas' (relación entre Zerimar, Rocafrut, Ferrimar), 'sucursales' (los 15 puntos y direcciones), 'politicas_servicios' (pagos, delivery, promociones, facturación).",
        },
      },
      required: ["tema"],
    },
  },
  {
    name: "buscar_faq",
    description: "Busca respuestas a preguntas frecuentes: pagos, factura, domicilio, empleo, devoluciones, contacto.",
    parameters: { type: "OBJECT", properties: { texto: { type: "STRING" } }, required: ["texto"] },
  },
  {
    name: "guardar_dato_cliente",
    description: "Guarda un dato que el cliente dijo con claridad (nombre, cédula, correo, ciudad) o la marca con la que habla (empresa).",
    parameters: {
      type: "OBJECT",
      properties: {
        campo: { type: "STRING", enum: ["nombre", "cedula", "correo", "ciudad", "empresa"] },
        valor: { type: "STRING" },
      },
      required: ["campo", "valor"],
    },
  },
  {
    name: "escalar_a_humano",
    description: "Pasa la conversación a un asesor humano. IMPORTANTE: antes de llamar esta herramienta debes tener el nombre del cliente y el motivo. Si no los tienes, pregúntalos primero con UN solo mensaje. Úsala cuando el cliente pide hablar con alguien, para cotizaciones, reclamos, domicilio o casos complejos.",
    parameters: { type: "OBJECT", properties: { motivo: { type: "STRING", description: "Motivo breve del escalado" } }, required: ["motivo"] },
  },
  {
    name: "notificar_asesor",
    description: "Envía un mensaje de WhatsApp al asesor humano con los datos del cliente que quiere ser atendido. Llámala justo después de escalar_a_humano, cuando ya tengas nombre del cliente y motivo confirmado.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre_cliente: { type: "STRING", description: "Nombre que el cliente dio" },
        motivo: { type: "STRING", description: "Motivo o razón por la que pide asesor" },
      },
      required: ["nombre_cliente", "motivo"],
    },
  },
];

function palabras(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)
    .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w))
    .slice(0, 4);
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function puntuar(rows: any[], ws: string[], campos: string[], tope: number) {
  return rows
    .map((r) => ({ r, s: ws.reduce((a, w) => a + campos.reduce((b, c, i) => b + (norm(String(r[c] ?? "")).includes(w) ? (i === 0 ? 3 : 1) : 0), 0), 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, tope)
    .map((x) => x.r);
}

export async function ejecutar(nombre: string, a: any, ctx: Ctx): Promise<any> {
  try {
    const emp: Empresa | null = a?.empresa === "zerimar" || a?.empresa === "rocafrut" ? a.empresa : ctx.empresa;

    if (nombre === "buscar_sucursales") {
      const w: string[] = ["activa=1"], p: any[] = [];
      if (emp) { w.push("empresa=?"); p.push(emp); }
      if (a?.ciudad) { w.push("ciudad LIKE ?"); p.push(`%${a.ciudad}%`); }
      if (a?.nombre) { w.push("(nombre LIKE ? OR direccion LIKE ?)"); p.push(`%${a.nombre}%`, `%${a.nombre}%`); }
      const rows = await q<any>(`SELECT empresa, nombre, direccion, ciudad, telefono, horario FROM bot_sucursales WHERE ${w.join(" AND ")} LIMIT 8`, p);
      const conMapas = rows.map((r: any) => {
        const queryMaps = encodeURIComponent(`${r.nombre}, ${r.direccion}, ${r.ciudad}`);
        return {
          ...r,
          mapa_url: `https://maps.google.com/?q=${queryMaps}`,
        };
      });
      const h = ahora();
      return conMapas.length ? { encontrado: true, ahora: `${h.dia} ${h.hora}`, sucursales: conMapas } : { encontrado: false };
    }

    if (nombre === "listar_promociones") {
      const p: any[] = [];
      let f = "";
      if (emp) { f = "AND empresa IN (?, 'ambas')"; p.push(emp); }
      const rows = await q(
        `SELECT empresa, titulo, descripcion, DATE_FORMAT(hasta,'%d/%m/%Y') AS vigente_hasta FROM bot_promociones WHERE activa=1 AND CURDATE() BETWEEN desde AND hasta ${f}`, p);
      return rows.length ? { encontrado: true, promociones: rows } : { encontrado: false };
    }

    if (nombre === "buscar_producto") {
      const ws = palabras(String(a?.texto ?? ""));
      if (!ws.length) return { encontrado: false };
      const p: any[] = [];
      let f = "";
      if (emp) { f = "AND empresa IN (?, 'ambas')"; p.push(emp); }
      const cond = ws.map(() => "(nombre LIKE ? OR categoria LIKE ? OR descripcion LIKE ?)").join(" OR ");
      ws.forEach((w) => p.push(`%${w}%`, `%${w}%`, `%${w}%`));
      const rows = await q(`SELECT empresa, nombre, descripcion, categoria, precio, stock FROM bot_productos WHERE activo=1 ${f} AND (${cond}) LIMIT 30`, p);
      const top = puntuar(rows, ws, ["nombre", "categoria", "descripcion"], 5).map((r) => ({
        nombre: r.nombre, descripcion: r.descripcion, categoria: r.categoria, precio: r.precio, disponible: r.stock > 0,
      }));
      return top.length ? { encontrado: true, productos: top } : { encontrado: false };
    }

    if (nombre === "buscar_conocimiento") {
      const tema = String(a?.tema ?? "").toLowerCase().replace(/[^a-z_]/g, "");
      const { readFileSync, existsSync } = await import("fs");
      const { join } = await import("path");
      const archivo = join(process.cwd(), "knowledge", `${tema}.md`);
      if (existsSync(archivo)) {
        const contenido = readFileSync(archivo, "utf-8");
        return { encontrado: true, tema, contenido };
      }
      return { encontrado: false, mensaje: "Documento de conocimiento no encontrado" };
    }

    if (nombre === "buscar_faq") {
      const ws = palabras(String(a?.texto ?? ""));
      if (!ws.length) return { encontrado: false };
      const p: any[] = [];
      let f = "";
      if (emp) { f = "WHERE empresa IN (?, 'ambas')"; p.push(emp); }
      const rows = await q(`SELECT tema, pregunta, respuesta FROM bot_faqs ${f}`, p);
      const top = puntuar(rows, ws, ["tema", "pregunta", "respuesta"], 3);
      return top.length ? { encontrado: true, faqs: top } : { encontrado: false };
    }

    if (nombre === "guardar_dato_cliente") {
      const campo = String(a?.campo), valor = String(a?.valor ?? "").trim().slice(0, 120);
      if (!valor) return { ok: false };
      if (campo === "nombre") await exec("UPDATE bot_contactos SET nombre=? WHERE id=?", [valor, ctx.contactoId]);
      else if (campo === "empresa") {
        const e = valor.toLowerCase().includes("roca") ? "rocafrut" : "zerimar";
        await exec("UPDATE bot_conversaciones SET empresa=? WHERE id=?", [e, ctx.convId]);
        ctx.empresa = e;
      } else if (["cedula", "correo", "ciudad"].includes(campo)) {
        await exec(`UPDATE bot_contactos SET datos=JSON_SET(COALESCE(datos, JSON_OBJECT()), '$.${campo}', ?) WHERE id=?`, [valor, ctx.contactoId]);
      } else return { ok: false };
      await exec("INSERT INTO bot_eventos (conversacion_id, tipo, detalle) VALUES (?, 'dato_capturado', ?)", [ctx.convId, JSON.stringify({ campo })]);
      return { ok: true, guardado: campo };
    }

    if (nombre === "escalar_a_humano") {
      ctx.escalar = String(a?.motivo ?? "Sin motivo").slice(0, 250);
      const d = await asesoresDisponibles();
      return { ok: true, asesores_disponibles_ahora: d.disponible, horario_asesores: d.texto };
    }

    if (nombre === "notificar_asesor") {
      const { enviarTexto } = await import("./evolution");
      const nombreCliente = String(a?.nombre_cliente ?? "Sin nombre").trim();
      const motivo = String(a?.motivo ?? "Sin motivo").trim();
      const asesorNum = (process.env.ASESOR_PHONE || "593963410409").replace(/\D/g, "");
      const asesorJid = `${asesorNum}@s.whatsapp.net`;
      const msg = `🔔 *Nuevo cliente requiere atención*\n\n👤 *Nombre:* ${nombreCliente}\n📋 *Motivo:* ${motivo}\n\nPor favor comunícate con él por este mismo WhatsApp.`;
      try {
        await enviarTexto(asesorJid, msg);
        return { ok: true, notificado: true };
      } catch (err: any) {
        console.warn("[notificar_asesor] Error enviando a asesor:", err?.message);
        return { ok: false, error: err?.message };
      }
    }

    return { error: "herramienta desconocida" };
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 200) };
  }
}
