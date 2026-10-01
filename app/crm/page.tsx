"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Tipos ─────────────────────────────────────────── */
type Item = {
  id: number; empresa: "zerimar" | "rocafrut" | null; estado: string; intencion: string | null;
  bot_activo: number; ultimo_msg_en: string | null; nombre: string | null;
  telefono: string; ultimo_texto: string | null; ultimo_rol: string | null;
  total_msgs: number; datos: any;
};
type Msg = { id: number; rol: "cliente" | "bot" | "agente"; texto: string; creado_en: string };
type Traza = { id: number; tools_llamadas: any; bloqueada: number; latencia_ms: number; tokens: number; creado_en: string };
type Detalle = { conv: any; mensajes: Msg[]; trazas: Traza[] };
type Filtro = "todos" | "espera" | "bot" | "asesor";
type Vista = "chat" | "dashboard" | "leads";
type Lead = { id: number; telefono: string; nombre: string | null; datos: any; creado_en: string; empresa: string | null; intencion: string | null; estado: string | null; bot_activo: number | null; ultimo_msg_en: string | null };
type Metricas = {
  stats: { total_conversaciones: number; con_bot: number; escaladas: number; con_humano: number; hoy: number; leads: number; esperando: number };
  intenciones: { intencion: string; n: number }[];
  porDia: { dia: string; n: number }[];
};

/* ─── Helpers ────────────────────────────────────────── */
const esPrueba = (t: string) => t.startsWith("sim-");
const tel = (t: string) => (esPrueba(t) ? "Chat de prueba" : "+" + t.split("@")[0]);
const nombreDe = (i: { nombre: string | null; telefono: string }) => i.nombre || tel(i.telefono);
const iniciales = (s: string) =>
  s.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
const estadoDe = (i: Pick<Item, "bot_activo" | "ultimo_rol">): Filtro =>
  i.bot_activo ? "bot" : i.ultimo_rol === "cliente" ? "espera" : "asesor";

function hora(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hoy = new Date();
  return d.toDateString() === hoy.toDateString()
    ? d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
}

function fechaCorta(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "2-digit" });
}

const BANDA: Record<Filtro, string> = {
  todos: "",
  bot: "Responde el asistente. Puedes tomar el chat cuando quieras.",
  espera: "Este cliente espera a un asesor.",
  asesor: "Atiendes tú. El asistente está en pausa en este chat.",
};

const INTENCION_COLOR: Record<string, string> = {
  "Consulta de producto/precio": "#1d5c47",
  "Consulta de sucursal/horario": "#2a5d8f",
  "Consulta de promociones": "#c9620f",
  "Pregunta frecuente": "#6b4fa3",
  "Pasó a asesor": "#8a2f5c",
  "Captura de datos": "#2d7d4a",
  "Dato del cliente guardado": "#2d7d4a",
  "Solicitó asesor": "#8a4308",
  "Conversación general": "#62716a",
  "Respuesta bloqueada": "#b91c1c",
};

// Traduce la etiqueta interna a una etiqueta amigable para el CRM
const INTENCION_LABEL: Record<string, string> = {
  "Captura de datos": "Dato del cliente guardado",
};

/* ─── Componente Dashboard ───────────────────────────── */
function Dashboard({ metricas }: { metricas: Metricas | null }) {
  if (!metricas) return <div className="dashboard-loading">Cargando métricas…</div>;
  const { stats, intenciones, porDia } = metricas;
  const maxN = Math.max(...(intenciones.map((i) => i.n) || [1]), 1);
  const maxDia = Math.max(...(porDia.map((d) => d.n) || [1]), 1);

  return (
    <div className="dashboard">
      <h2 className="dash-titulo">Panel general</h2>

      {/* Tarjetas de métricas */}
      <div className="metricas-grid">
        <div className="metrica-card verde">
          <div className="metrica-valor">{stats.total_conversaciones}</div>
          <div className="metrica-label">Conversaciones totales</div>
        </div>
        <div className="metrica-card azul">
          <div className="metrica-valor">{stats.leads}</div>
          <div className="metrica-label">Leads capturados</div>
        </div>
        <div className="metrica-card naranja">
          <div className="metrica-valor">{stats.escaladas + stats.con_humano}</div>
          <div className="metrica-label">Pasaron a asesor</div>
        </div>
        <div className="metrica-card morado">
          <div className="metrica-valor">{stats.hoy}</div>
          <div className="metrica-label">Conversaciones hoy</div>
        </div>
      </div>

      {/* Gráfica de actividad 7 días */}
      {porDia.length > 0 && (
        <section className="dash-seccion">
          <h3 className="dash-seccion-titulo">Actividad últimos 7 días</h3>
          <div className="barra-chart">
            {porDia.map((d) => (
              <div key={d.dia} className="barra-col">
                <div className="barra-wrap">
                  <div className="barra-fill" style={{ height: `${Math.round((d.n / maxDia) * 100)}%` }} />
                </div>
                <div className="barra-label">{new Date(d.dia + "T12:00:00").toLocaleDateString("es-EC", { day: "2-digit", month: "short" })}</div>
                <div className="barra-n">{d.n}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Intenciones detectadas */}
      {intenciones.length > 0 && (
        <section className="dash-seccion">
          <h3 className="dash-seccion-titulo">Qué consultaron los clientes</h3>
          <div className="intent-lista">
            {intenciones.map((i) => {
              const label = INTENCION_LABEL[i.intencion] ?? i.intencion;
              return (
                <div key={i.intencion} className="intent-fila">
                  <span className="intent-tag" style={{ background: INTENCION_COLOR[label] ?? INTENCION_COLOR[i.intencion] ?? "#62716a" }}>
                    {label}
                  </span>
                  <div className="intent-bar-wrap">
                    <div className="intent-bar" style={{ width: `${Math.round((i.n / maxN) * 100)}%`, background: INTENCION_COLOR[label] ?? INTENCION_COLOR[i.intencion] ?? "#62716a" }} />
                  </div>
                  <span className="intent-n">{i.n}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {intenciones.length === 0 && (
        <div className="dash-empty">Aún no hay datos de intenciones. Prueba el bot con un cliente de prueba para generar conversaciones.</div>
      )}
    </div>
  );
}

/* ─── Componente Leads ───────────────────────────────── */
function Leads({ leads }: { leads: Lead[] | null }) {
  if (!leads) return <div className="dashboard-loading">Cargando leads…</div>;

  if (leads.length === 0) {
    return (
      <div className="dashboard">
        <h2 className="dash-titulo">Leads capturados</h2>
        <div className="dash-empty">
          Aún no hay leads. El bot captura un lead cuando el cliente da su nombre, correo, cédula o ciudad.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2 className="dash-titulo">Leads capturados <span className="leads-count">{leads.length}</span></h2>
      <div className="leads-tabla-wrap">
        <table className="leads-tabla">
          <thead>
            <tr>
              <th>Contacto</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Ciudad</th>
              <th>Marca</th>
              <th>Intención</th>
              <th>Estado</th>
              <th>Último contacto</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const datos = typeof l.datos === "string" ? JSON.parse(l.datos || "{}") : (l.datos ?? {});
              return (
                <tr key={l.id}>
                  <td>
                    <div className="lead-nombre">{l.nombre ?? <span className="suave">sin nombre</span>}</div>
                  </td>
                  <td><span className="lead-tel">{tel(l.telefono)}</span></td>
                  <td>{datos.correo ?? <span className="suave">—</span>}</td>
                  <td>{datos.ciudad ?? <span className="suave">—</span>}</td>
                  <td>
                    {l.empresa ? (
                      <span className={`tag ${l.empresa}`}>{l.empresa === "zerimar" ? "Zerimar" : "Rocafrut"}</span>
                    ) : <span className="suave">—</span>}
                  </td>
                  <td>
                    {l.intencion ? (
                      <span className="intent-pill" style={{ background: INTENCION_COLOR[l.intencion] ?? "#62716a" }}>
                        {l.intencion}
                      </span>
                    ) : <span className="suave">—</span>}
                  </td>
                  <td>
                    <span className={`estado-pill ${l.bot_activo ? "bot" : l.estado === "ESCALADO" ? "escalado" : "humano"}`}>
                      {l.bot_activo ? "Con bot" : l.estado === "ESCALADO" ? "Escalado" : l.estado ?? "—"}
                    </span>
                  </td>
                  <td>{fechaCorta(l.ultimo_msg_en)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── CRM Principal ──────────────────────────────────── */
export default function CRM() {
  const [items, setItems] = useState<Item[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [sel, setSel] = useState<number | null>(null);
  const [det, setDet] = useState<Detalle | null>(null);
  const [texto, setTexto] = useState("");
  const [modo, setModo] = useState<"asesor" | "cliente">("asesor");
  const [error, setError] = useState("");
  const [vista, setVista] = useState<Vista>("dashboard");
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  const cargarLista = useCallback(async () => {
    const r = await fetch("/api/crm/conversaciones", { cache: "no-store" });
    if (r.ok) setItems((await r.json()).items);
  }, []);

  const cargarDetalle = useCallback(async (id: number) => {
    const r = await fetch(`/api/crm/conversaciones/${id}`, { cache: "no-store" });
    if (r.ok) setDet(await r.json());
  }, []);

  const cargarMetricas = useCallback(async () => {
    const r = await fetch("/api/crm/metricas", { cache: "no-store" });
    if (r.ok) setMetricas(await r.json());
  }, []);

  const cargarLeads = useCallback(async () => {
    const r = await fetch("/api/crm/leads", { cache: "no-store" });
    if (r.ok) setLeads((await r.json()).leads);
  }, []);

  useEffect(() => {
    cargarLista();
    const t = setInterval(cargarLista, 4000);
    return () => clearInterval(t);
  }, [cargarLista]);

  useEffect(() => {
    if (vista === "dashboard") { cargarMetricas(); const t = setInterval(cargarMetricas, 10000); return () => clearInterval(t); }
    if (vista === "leads") { cargarLeads(); const t = setInterval(cargarLeads, 10000); return () => clearInterval(t); }
  }, [vista, cargarMetricas, cargarLeads]);

  useEffect(() => {
    if (sel == null) { setDet(null); return; }
    cargarDetalle(sel);
    const t = setInterval(() => cargarDetalle(sel), 3000);
    return () => clearInterval(t);
  }, [sel, cargarDetalle]);

  useEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [det?.mensajes.length, sel]);

  async function post(url: string, body: object) {
    setError("");
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setError(j.error || "No se pudo completar la acción");
    return j;
  }

  async function accion(a: "tomar" | "devolver") {
    if (sel == null) return;
    await post(`/api/crm/conversaciones/${sel}`, { accion: a });
    cargarDetalle(sel); cargarLista();
  }

  async function enviar() {
    if (sel == null || !texto.trim()) return;
    const t = texto.trim(); setTexto("");
    if (modo === "cliente") await post("/api/simulador", { texto: t, conversacionId: sel });
    else await post(`/api/crm/conversaciones/${sel}`, { accion: "enviar", texto: t });
    cargarDetalle(sel); cargarLista();
  }

  async function nuevaPrueba() {
    const j = await post("/api/simulador", { texto: "Hola" });
    if (j.conversacionId) { await cargarLista(); setSel(j.conversacionId); setModo("cliente"); setVista("chat"); }
  }

  const esperan = items.filter((i) => estadoDe(i) === "espera").length;
  const visibles = items.filter((i) => filtro === "todos" || estadoDe(i) === filtro);
  const estado = det ? estadoDe({ bot_activo: det.conv.bot_activo, ultimo_rol: det.mensajes.at(-1)?.rol ?? null }) : "todos";
  const prueba = det ? esPrueba(det.conv.telefono) : false;
  const datos = det?.conv.datos ? (typeof det.conv.datos === "string" ? JSON.parse(det.conv.datos) : det.conv.datos) : {};

  return (
    <div className={`app ${sel != null && vista === "chat" ? "con-sel" : ""}`}>
      {/* ─── Barra lateral ─── */}
      <aside className="lista">
        <div className="lista-top">
          <h1 className="marca">Zerimar <span>y</span> Rocafrut</h1>

          {/* Navegación principal */}
          <div className="nav-vistas" role="navigation">
            <button className="nav-btn" aria-pressed={vista === "chat"} onClick={() => setVista("chat")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Chats
              {esperan > 0 && <span className="nav-badge">{esperan}</span>}
            </button>
            <button className="nav-btn" aria-pressed={vista === "dashboard"} onClick={() => setVista("dashboard")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Dashboard
            </button>
            <button className="nav-btn" aria-pressed={vista === "leads"} onClick={() => setVista("leads")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Leads
            </button>
          </div>

          {vista === "chat" && (
            <>
              <p className="resumen-dia">
                {items.length === 0 ? "Aún no hay conversaciones." : esperan > 0
                  ? <><b>{esperan} {esperan === 1 ? "cliente espera" : "clientes esperan"}</b> a un asesor.</>
                  : "Nadie está esperando. El asistente va al día."}
              </p>
              <div className="tabs" role="group" aria-label="Filtrar conversaciones">
                {(([["todos", "Todos"], ["espera", "Esperan"], ["bot", "Bot"], ["asesor", "Asesor"]] as const)).map(([k, l]) => (
                  <button key={k} className="tab" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{l}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Lista de conversaciones */}
        {vista === "chat" && (
          <div className="items">
            {visibles.length === 0 && <p className="vacio-lista">No hay conversaciones en esta vista.</p>}
            {visibles.map((i) => (
              <button key={i.id} className="item" aria-current={sel === i.id} onClick={() => setSel(i.id)}>
                <span className={`avatar ${i.empresa ?? ""}`}>{iniciales(nombreDe(i))}</span>
                <span style={{ minWidth: 0 }}>
                  <div className="item-nombre">{nombreDe(i)}</div>
                  <div className="item-previa">
                    {i.ultimo_rol === "cliente" ? "" : i.ultimo_rol === "bot" ? "Bot: " : "Tú: "}
                    {i.ultimo_texto}
                  </div>
                  {i.intencion && <div className="item-intencion">{i.intencion}</div>}
                </span>
                <span className="item-meta">
                  {hora(i.ultimo_msg_en)}
                  {estadoDe(i) === "espera" && <span className="punto" title="Espera a un asesor" />}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="pie-lista">
          <button className="btn-prueba" onClick={nuevaPrueba}>
            ＋ Probar con cliente de prueba
          </button>
        </div>
      </aside>

      {/* ─── Área central: Chat, Dashboard o Leads ─── */}
      <main className="hilo">
        {vista === "dashboard" && <Dashboard metricas={metricas} />}
        {vista === "leads" && <Leads leads={leads} />}

        {vista === "chat" && !det && (
          <div className="bienvenida">
            <div className="bienvenida-icon">🤖</div>
            <h2>Elige una conversación</h2>
            <p>Verás lo que escribió el cliente, cómo respondió el bot, qué herramientas usó y si alucina o no. Sin WhatsApp, prueba con un cliente de prueba.</p>
          </div>
        )}

        {vista === "chat" && det && (
          <>
            <header className="hilo-head">
              <button className="volver" onClick={() => setSel(null)} aria-label="Volver">←</button>
              <div>
                <h2 className="hilo-titulo">
                  {nombreDe(det.conv)}
                  {det.conv.empresa && <span className={`tag ${det.conv.empresa}`}>{det.conv.empresa === "zerimar" ? "Zerimar" : "Rocafrut"}</span>}
                </h2>
                <div className="hilo-sub">
                  {tel(det.conv.telefono)}
                  {det.conv.intencion && <span className="intent-pill" style={{ background: INTENCION_COLOR[det.conv.intencion] ?? "#62716a" }}>{det.conv.intencion}</span>}
                </div>
              </div>
              {det.conv.bot_activo
                ? <button className="accion primaria" onClick={() => accion("tomar")}>Tomar el chat</button>
                : <button className="accion suave" onClick={() => accion("devolver")}>Devolver al bot</button>}
            </header>

            <div className={`banda ${estado}`}>{BANDA[estado]}</div>

            <div className="mensajes">
              {det.mensajes.map((m) => (
                <div key={m.id} className={`fila ${m.rol}`}>
                  {m.rol !== "cliente" && <span className="quien">{m.rol === "bot" ? "Asistente" : "Asesor"}</span>}
                  <div className="burbuja">{m.texto}</div>
                  <span className="hora">{hora(m.creado_en)}</span>
                </div>
              ))}
              <div ref={fin} />
            </div>

            <div className="compositor">
              {error && <p className="aviso-bot" role="alert" style={{ color: "#a5321f" }}>{error}</p>}
              {prueba && (
                <div className="modo">
                  <label><input type="radio" checked={modo === "cliente"} onChange={() => setModo("cliente")} /> Como cliente</label>
                  <label><input type="radio" checked={modo === "asesor"} onChange={() => setModo("asesor")} /> Como asesor</label>
                </div>
              )}
              {det.conv.bot_activo && modo === "asesor" && <p className="aviso-bot">Si escribes aquí, tomas el chat y el asistente se pausa.</p>}
              <div className="caja">
                <textarea rows={1} value={texto}
                  placeholder={modo === "cliente" && prueba ? "Escribe como si fueras el cliente" : "Escribe tu respuesta"}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
                <button className="enviar" disabled={!texto.trim()} onClick={enviar}>Enviar</button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ─── Panel derecho (ficha del cliente) ─── */}
      {vista === "chat" && det && (
        <aside className="ficha">
          {/* Estado del bot */}
          <section>
            <h3>Estado del bot</h3>
            <div className="bot-status">
              <div className={`bot-indicator ${det.conv.bot_activo ? "activo" : "pausado"}`}>
                <span className="bot-dot" />
                {det.conv.bot_activo ? "Bot activo — respondiendo" : "Bot pausado — asesor al control"}
              </div>
              <div className="bot-stats">
                <span>{det.mensajes.filter(m => m.rol === "bot").length} respuestas del bot</span>
                <span>{det.mensajes.filter(m => m.rol === "cliente").length} mensajes del cliente</span>
              </div>
            </div>
          </section>

          {det.conv.resumen_agente && (
            <section>
              <h3>Resumen para el asesor</h3>
              <p>{det.conv.resumen_agente}</p>
            </section>
          )}

          {det.conv.motivo_escalamiento && (
            <section>
              <h3>Por qué pasó a asesor</h3>
              <p className="escalado-motivo">{det.conv.motivo_escalamiento}</p>
            </section>
          )}

          <section>
            <h3>Lo que sabemos del cliente</h3>
            <ul className="datos-lista">
              <li><span className="dato-key">Nombre</span><span>{det.conv.nombre ?? <span className="suave">sin dato</span>}</span></li>
              {["cedula", "correo", "ciudad"].map((k) => (
                <li key={k}>
                  <span className="dato-key">{{ cedula: "Cédula", correo: "Correo", ciudad: "Ciudad" }[k]}</span>
                  <span>{datos[k] ?? <span className="suave">sin dato</span>}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Cómo respondió el bot</h3>
            <p className="traza-hint">Aquí puedes verificar si alucina: si hay datos sin verificar, aparece en rojo.</p>
            {det.trazas.length === 0 && <p className="suave">Todavía no ha respondido.</p>}
            {det.trazas.map((t) => {
              const tl = typeof t.tools_llamadas === "string" ? JSON.parse(t.tools_llamadas) : t.tools_llamadas ?? [];
              return (
                <div key={t.id} className={`traza ${t.bloqueada ? "freno" : "ok"}`}>
                  <div className="traza-estado">
                    {t.bloqueada
                      ? <><span className="traza-ico">⛔</span> <b>Respuesta bloqueada</b> — había un dato sin verificar</>
                      : <><span className="traza-ico">✅</span> Respuesta verificada</>}
                  </div>
                  <div className="traza-detalle">
                    {tl.length
                      ? "Consultó: " + [...new Set<string>(tl.map((x: any) => x.nombre))].join(", ")
                      : "Respondió sin consultar herramientas"}
                  </div>
                  <div className="traza-meta">
                    {((t.latencia_ms ?? 0) / 1000).toFixed(1)} s · {t.tokens ?? 0} tokens
                  </div>
                </div>
              );
            })}
          </section>
        </aside>
      )}
    </div>
  );
}
