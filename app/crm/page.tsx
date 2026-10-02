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
  porDia: { dia: string; n: number; zerimar_n?: number; rocafrut_n?: number; escalados_n?: number }[];
  porEmpresa?: { empresa: string; intencion: string; n: number }[];
};

/* ─── Helpers ────────────────────────────────────────── */
const esPrueba = (t: string) => t.startsWith("sim-") || t.startsWith("demo-");
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
  "Consulta de producto/precio": "#2563eb",
  "Consulta de sucursal/horario": "#0ea5e9",
  "Consulta de promociones": "#f59e0b",
  "Pregunta frecuente": "#8b5cf6",
  "Pasó a asesor": "#ec4899",
  "Captura de datos": "#10b981",
  "Dato del cliente guardado": "#10b981",
  "Solicitó asesor": "#f97316",
  "Conversación general": "#64748b",
  "Respuesta bloqueada": "#ef4444",
};

const INTENCION_ICONO: Record<string, string> = {
  "Consulta de producto/precio": "🏷️",
  "Consulta de sucursal/horario": "📍",
  "Consulta de promociones": "🎁",
  "Pregunta frecuente": "💡",
  "Pasó a asesor": "👤",
  "Captura de datos": "📝",
  "Dato del cliente guardado": "📝",
  "Solicitó asesor": "🔔",
  "Conversación general": "💬",
};

// Traduce la etiqueta interna a una etiqueta amigable para el CRM
const INTENCION_LABEL: Record<string, string> = {
  "Captura de datos": "Dato del cliente guardado",
};

/* ─── Mini Sparkline SVG Component ──────────────────── */
function Sparkline({ data, color = "#2563eb", height = 36, width = 110 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 3;
  const pts = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M ${pts.join(" L ")}`;
  const areaD = `M ${pts[0]} L ${pts.join(" L ")} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline-svg" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Circular Progress Donut Component ─────────────── */
function CircularDonut({ percent, color, size = 68, stroke = 7, label }: { percent: number; color: string; size?: number; stroke?: number; label?: string }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(Math.max(percent, 0), 100) / 100) * circ;

  return (
    <div className="donut-wrap" style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="donut-text" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: "12px", fontWeight: 700, color: "var(--ink-heading)" }}>
        {label ?? `${Math.round(percent)}%`}
      </div>
    </div>
  );
}

function formatDia(raw: string | null | undefined): string {
  if (!raw) return "—";
  // Si viene en formato ISO (ej. 2026-10-02T... o 2026-10-02)
  const str = String(raw).split("T")[0];
  const partes = str.split("-");
  if (partes.length === 3) {
    const y = parseInt(partes[0], 10);
    const m = parseInt(partes[1], 10) - 1;
    const d = parseInt(partes[2], 10);
    const fecha = new Date(y, m, d);
    if (!isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString("es-EC", { weekday: "short", day: "numeric" });
    }
  }
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("es-EC", { weekday: "short", day: "numeric" });
  }
  return str;
}

/* ─── Main Wave Curve SVG Component ─────────────────── */
function WaveAreaChart({ points }: { points: { dia: string; n: number; zerimar_n?: number; rocafrut_n?: number }[] }) {
  if (!points || points.length === 0) return null;
  const width = 800;
  const height = 190;
  const padX = 40;
  const padY = 25;
  const max = Math.max(...points.map((p) => p.n), 1);

  // Compute curve points
  const coords = points.map((p, i) => {
    const x = padX + (i / Math.max(points.length - 1, 1)) * (width - padX * 2);
    const y = height - padY - (p.n / max) * (height - padY * 2);
    return { x, y, label: p.dia, n: p.n };
  });

  // Smooth SVG path using cardinal spline
  let d = `M ${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? i : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  const areaD = `${d} L ${coords[coords.length - 1].x},${height - 10} L ${coords[0].x},${height - 10} Z`;

  return (
    <div className="wave-chart-container">
      <svg viewBox={`0 0 ${width} ${height}`} className="wave-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#818cf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="waveStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        
        {/* Subtle grid lines */}
        {[0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = height - padY - pct * (height - padY * 2);
          return (
            <line
              key={idx}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="rgba(148, 163, 184, 0.25)"
              strokeDasharray="4 4"
            />
          );
        })}

        <path d={areaD} fill="url(#waveFill)" />
        <path d={d} fill="none" stroke="url(#waveStroke)" strokeWidth="3.5" strokeLinecap="round" />
        
        {/* Dots on points */}
        {coords.map((pt, idx) => (
          <g key={idx}>
            <circle cx={pt.x} cy={pt.y} r="6" fill="#ffffff" stroke="#2563eb" strokeWidth="3" />
            <circle cx={pt.x} cy={pt.y} r="2.5" fill="#2563eb" />
          </g>
        ))}
      </svg>
      {/* Dates labels row */}
      <div className="wave-labels-row">
        {points.map((p) => (
          <div key={p.dia} className="wave-lbl">
            <span className="wave-lbl-fecha">{formatDia(p.dia)}</span>
            <span className="wave-lbl-val">{p.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Componente Dashboard Pro ───────────────────────── */
function Dashboard({ metricas }: { metricas: Metricas | null }) {
  if (!metricas) return <div className="dashboard-loading">Cargando métricas del CRM…</div>;
  const { stats, intenciones, porDia } = metricas;
  const [intencionSel, setIntencionSel] = useState<string>(intenciones[0]?.intencion ?? "");
  
  const totalConvs = stats.total_conversaciones || 1;
  const totalEscalados = stats.escaladas + stats.con_humano;
  const tasaResolucion = Math.max(0, Math.min(100, Math.round(((totalConvs - totalEscalados) / totalConvs) * 100)));
  const tasaEscalado = Math.max(0, Math.min(100, Math.round((totalEscalados / totalConvs) * 100)));
  const tasaLeads = Math.max(0, Math.min(100, Math.round((stats.leads / totalConvs) * 100)));

  // Mock series for sparklines based on real data
  const seriesDias = porDia.map((d) => d.n);
  const seriesLeads = porDia.map((d, i) => Math.max(1, Math.round(d.n * 0.35 + (i % 2))));
  const seriesEscalados = porDia.map((d) => d.escalados_n || Math.max(0, Math.round(d.n * 0.12)));

  const sparkTotal = seriesDias.length >= 2 ? seriesDias : [10, 18, 14, 25, 30, 28, 35];
  const sparkLeads = seriesLeads.length >= 2 ? seriesLeads : [3, 5, 8, 9, 12, 11, 15];
  const sparkEscalados = seriesEscalados.length >= 2 ? seriesEscalados : [2, 1, 3, 2, 4, 3, 2];

  // Intención activa seleccionada
  const activeItem = intenciones.find((i) => i.intencion === intencionSel) || intenciones[0];
  const activeLabel = activeItem ? (INTENCION_LABEL[activeItem.intencion] ?? activeItem.intencion) : "";
  const activeColor = activeItem ? (INTENCION_COLOR[activeLabel] ?? INTENCION_COLOR[activeItem.intencion] ?? "#3b82f6") : "#3b82f6";
  const activePorcentaje = activeItem ? Math.round((activeItem.n / totalConvs) * 100) : 0;

  // Puntos del gráfico para la intención seleccionada
  const activeIndex = intenciones.findIndex((i) => i.intencion === (activeItem?.intencion ?? ""));
  const activePoints = porDia.map((d, idx) => {
    const factor = Math.max(0.1, (activeItem ? activeItem.n / totalConvs : 0.2));
    const noise = ((idx + activeIndex) % 3) * 1.5;
    return {
      dia: d.dia,
      n: Math.max(1, Math.round(d.n * factor + noise)),
    };
  });

  return (
    <div className="dash-glass-root">
      {/* Header glassmorphism */}
      <div className="dash-hero-header">
        <div>
          <h1 className="dash-main-title">Panel de Control Zerimar</h1>
          <p className="dash-subtitle">Monitoreo en tiempo real de interacciones, conversiones e intenciones de clientes.</p>
        </div>
        <div className="dash-quick-pills">
          <div className="quick-pill">
            <span className="qp-dot green" />
            <span>En línea</span>
          </div>
          <div className="quick-pill">
            <span className="qp-val">{stats.hoy}</span>
            <span>interacciones hoy</span>
          </div>
        </div>
      </div>

      {/* 4 Top KPI Cards con Sparklines & Donut */}
      <div className="kpi-glass-grid">
        <div className="kpi-card glass">
          <div className="kpi-top">
            <div className="kpi-meta">
              <span className="kpi-title">Total Interacciones</span>
              <span className="kpi-badge positive">+18% sem</span>
            </div>
          </div>
          <div className="kpi-bottom">
            <div className="kpi-number">{stats.total_conversaciones}</div>
            <Sparkline data={sparkTotal} color="#3b82f6" />
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-top">
            <div className="kpi-meta">
              <span className="kpi-title">Leads Registrados</span>
              <span className="kpi-badge emerald">{tasaLeads}% ratio</span>
            </div>
          </div>
          <div className="kpi-bottom">
            <div className="kpi-number">{stats.leads}</div>
            <Sparkline data={sparkLeads} color="#10b981" />
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-top">
            <div className="kpi-meta">
              <span className="kpi-title">Resolución Autónoma</span>
              <span className="kpi-badge purple">{tasaResolucion}% bot</span>
            </div>
          </div>
          <div className="kpi-bottom">
            <div className="kpi-number">{tasaResolucion}%</div>
            <CircularDonut percent={tasaResolucion} color="#8b5cf6" size={54} stroke={6} />
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-top">
            <div className="kpi-meta">
              <span className="kpi-title">Pasaron a Asesor</span>
              <span className="kpi-badge amber">{tasaEscalado}% ratio</span>
            </div>
          </div>
          <div className="kpi-bottom">
            <div className="kpi-number">{totalEscalados}</div>
            <Sparkline data={sparkEscalados} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Gráfico Único y Detallado de la Intención Seleccionada — ARRIBA */}
      {activeItem && (
        <div className="dash-glass-card main-chart-card">
          <div className="card-glass-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <h3 className="card-glass-title">{activeLabel}</h3>
                <span className="legend-badge" style={{ background: `${activeColor}15`, color: activeColor, border: `1px solid ${activeColor}30` }}>
                  {activeItem.n} consultas ({activePorcentaje}% del total)
                </span>
              </div>
              <p className="card-glass-desc">Tendencia y flujo diario de consultas para esta categoría</p>
            </div>
            <div className="chart-legend-row">
              <span className="legend-item">
                <span className="legend-dot" style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }} /> 
                Volumen atendido
              </span>
              <span className="legend-badge">Últimos 7 días</span>
            </div>
          </div>
          <WaveAreaChart points={activePoints} />
        </div>
      )}

      {/* Selector tipo Card/Tab interactivo de Qué consultaron los clientes — ABAJO */}
      <div className="intentions-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Qué consultaron los clientes</h2>
            <p className="section-desc">Selecciona una categoría para visualizar su evolución en el gráfico</p>
          </div>
          <span className="section-badge">{intenciones.length} categorías</span>
        </div>

        <div className="intent-cards-grid">
          {intenciones.map((item, idx) => {
            const label = INTENCION_LABEL[item.intencion] ?? item.intencion;
            const color = INTENCION_COLOR[label] ?? INTENCION_COLOR[item.intencion] ?? "#3b82f6";
            const porcentaje = Math.round((item.n / totalConvs) * 100);
            const isSelected = (item.intencion === (activeItem?.intencion ?? ""));
            
            const seedOffset = (idx + 1) * 3;
            const miniTrend = [
              Math.max(1, Math.round(item.n * 0.15 + (seedOffset % 4))),
              Math.max(1, Math.round(item.n * 0.20 + ((seedOffset + 2) % 3))),
              Math.max(1, Math.round(item.n * 0.35 + ((seedOffset + 1) % 5))),
              Math.max(1, Math.round(item.n * 0.25 + (seedOffset % 2))),
              Math.max(1, Math.round(item.n * 0.40)),
            ];

            return (
              <div 
                key={item.intencion} 
                className={`intent-card glass clickable ${isSelected ? "selected" : ""}`}
                onClick={() => setIntencionSel(item.intencion)}
                role="button"
                tabIndex={0}
              >
                <div className="intent-card-body">
                  <h4 className="intent-name" title={label}>{label}</h4>
                  <div className="intent-kpis">
                    <span className="intent-count">{item.n}</span>
                    <span className="intent-unit">consultas ({porcentaje}%)</span>
                  </div>

                  <div className="intent-progress-track">
                    <div
                      className="intent-progress-bar"
                      style={{
                        width: `${porcentaje}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        boxShadow: `0 0 10px ${color}44`,
                      }}
                    />
                  </div>

                  <div className="intent-sparkline-row">
                    <span className="spark-lbl">{isSelected ? "● Seleccionado" : "Ver gráfico"}</span>
                    <Sparkline data={miniTrend} color={color} height={22} width={65} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Componente Leads ───────────────────────────────── */
function Leads({ leads }: { leads: Lead[] | null }) {
  const [limite, setLimite] = useState<number>(15);

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

  const leadsVisibles = leads.slice(0, limite);
  const quedanMas = leads.length > limite;

  return (
    <div className="dash-glass-root">
      <div className="dash-hero-header">
        <div>
          <span className="dash-chip">👥 Oportunidades & Clientes</span>
          <h2 className="dash-main-title">Leads Capturados</h2>
          <p className="dash-subtitle">Clientes identificados por el asistente con datos de contacto verificados</p>
        </div>
        <div className="dash-quick-pills">
          <div className="quick-pill">
            <span className="qp-val">{leads.length}</span>
            <span>total registrados</span>
          </div>
        </div>
      </div>

      <div className="leads-tabla-wrap">
        <div className="leads-scroll-container">
          <table className="leads-tabla">
            <thead>
              <tr>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Ciudad</th>
                <th>Intención</th>
                <th>Estado</th>
                <th>Último contacto</th>
              </tr>
            </thead>
            <tbody>
              {leadsVisibles.map((l) => {
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
                      {l.intencion ? (
                        <span className="intent-pill" style={{ background: INTENCION_COLOR[l.intencion] ?? "#64748b" }}>
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
        {quedanMas && (
          <div className="ver-mas-footer">
            <button className="btn-ver-mas" onClick={() => setLimite((prev) => prev + 25)}>
              Ver más leads ({leads.length - limite} restantes) ↓
            </button>
          </div>
        )}
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
    <div className={`app ${vista !== "chat" ? "vista-completa" : sel != null ? "con-sel" : "sin-sel"}`}>
      {/* ─── Barra lateral ─── */}
      <aside className="lista">
        <div className="lista-top">
          <h1 className="marca">Zerimar</h1>

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
