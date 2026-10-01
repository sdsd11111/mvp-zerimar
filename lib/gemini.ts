const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type Content = { role: "user" | "model"; parts: any[] };

export async function generar(body: Record<string, any>) {
  const models = [
    process.env.GEMINI_MODEL || "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest"
  ];
  
  let lastError: any;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(`${BASE}/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
          body: JSON.stringify(body),
        });
        if (r.ok) return await r.json();
        const errText = await r.text();
        lastError = new Error(`Gemini ${model} ${r.status}: ${errText}`);
        if (r.status !== 503 && r.status !== 429) {
          break; // error de cliente, probar siguiente modelo
        }
        await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
      } catch (err) {
        lastError = err;
        await new Promise((res) => setTimeout(res, 800));
      }
    }
  }
  throw lastError;
}

export function textoDe(res: any): string {
  const parts: any[] = res?.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((p) => typeof p.text === "string" && !p.thought).map((p) => p.text).join("").trim();
}
