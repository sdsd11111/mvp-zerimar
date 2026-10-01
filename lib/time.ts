import { q } from "./db";

const TZ = "America/Guayaquil";

export function ahora() {
  const p = new Intl.DateTimeFormat("es-EC", {
    timeZone: TZ, weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { dia: g("weekday"), hora: `${g("hour")}:${g("minute")}` };
}

export async function asesoresDisponibles(): Promise<{ disponible: boolean; texto: string }> {
  const rows = await q<{ valor: any }>("SELECT valor FROM bot_config WHERE clave='horario_asesores'");
  let cfg = rows[0]?.valor;
  if (typeof cfg === "string") cfg = JSON.parse(cfg);
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const hora = `${g("hour")}:${g("minute")}`;
  const rango: string[] | null = g("weekday") === "Sun" ? cfg?.["dom"] ?? null : cfg?.["lun-sab"] ?? null;
  const disponible = !!rango && hora >= rango[0] && hora < rango[1];
  const l = cfg?.["lun-sab"];
  return { disponible, texto: l ? `de lunes a sábado de ${l[0]} a ${l[1]}` : "en horario laboral" };
}
