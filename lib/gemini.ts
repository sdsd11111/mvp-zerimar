const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type Content = { role: "user" | "model"; parts: any[] };

export async function generar(body: Record<string, any>) {
  // Cascada de llaves de Google Gemini (solo keys válidas del env)
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_BACKUP,
  ].filter(Boolean) as string[];

  const models = [process.env.GEMINI_MODEL || "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];
  let lastError: any;

  // 1) Cascada de keys de Google Gemini
  for (const apiKey of [...new Set(geminiKeys)]) {
    for (const model of models) {
      try {
        const r = await fetch(`${BASE}/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (r.ok) return await r.json();
        const errText = await r.text();
        lastError = new Error(`Gemini ${model} ${r.status}: ${errText}`);
        // Si status 400 (bad model), intenta el siguiente model; si 429/503 cuota, cambia de key
        if (r.status === 429 || r.status === 503) break;
      } catch (err) {
        lastError = err;
      }
    }
  }

  // 2) Fallback OpenRouter — con function calling completo (formato OpenAI Tools)
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) throw lastError;

  try {
    // ── A) Convertir contenido Gemini → mensajes OpenAI ──────────────────────
    const messages: any[] = [];

    if (body.systemInstruction?.parts?.[0]?.text) {
      messages.push({ role: "system", content: body.systemInstruction.parts[0].text });
    }

    for (const c of body.contents || []) {
      const isModel = c.role === "model" || c.role === "assistant";
      const isUser = c.role === "user";

      if (isModel) {
        const textParts = (c.parts ?? []).filter(
          (p: any) => typeof p.text === "string" && !p.thought
        );
        const callParts = (c.parts ?? []).filter((p: any) => p.functionCall);

        if (callParts.length > 0) {
          // Turno del asistente con function calls
          messages.push({
            role: "assistant",
            content: null,
            tool_calls: callParts.map((p: any, i: number) => ({
              id: `call_${i}_${p.functionCall.name}`,
              type: "function",
              function: {
                name: p.functionCall.name,
                arguments: JSON.stringify(p.functionCall.args ?? {}),
              },
            })),
          });
        } else if (textParts.length > 0) {
          messages.push({
            role: "assistant",
            content: textParts.map((p: any) => p.text).join(""),
          });
        }
      } else if (isUser) {
        const textParts = (c.parts ?? []).filter((p: any) => typeof p.text === "string");
        const resParts = (c.parts ?? []).filter((p: any) => p.functionResponse);

        if (resParts.length > 0) {
          // Resultados de herramientas → mensajes role=tool
          for (let i = 0; i < resParts.length; i++) {
            const fr = resParts[i].functionResponse;
            messages.push({
              role: "tool",
              tool_call_id: `call_${i}_${fr.name}`,
              content: JSON.stringify(fr.response?.result ?? fr.response ?? {}),
            });
          }
        } else if (textParts.length > 0) {
          messages.push({
            role: "user",
            content: textParts.map((p: any) => p.text).join(""),
          });
        }
      }
    }

    // ── B) Convertir declaraciones Gemini → tools OpenAI ──────────────────────
    // Los schemas de Gemini usan tipos en MAYÚSCULAS ("OBJECT", "STRING") y estructuras
    // anidadas distintas. Los normalizamos a JSON Schema estándar (OpenAI).
    function normSchema(s: any): any {
      if (!s || typeof s !== "object") return s;
      const out: any = {};
      if (s.type) out.type = String(s.type).toLowerCase();
      if (s.description) out.description = s.description;
      if (s.enum) out.enum = s.enum;
      if (s.properties) {
        out.properties = {};
        for (const [k, v] of Object.entries(s.properties)) out.properties[k] = normSchema(v);
      }
      if (s.required) out.required = s.required;
      if (s.items) out.items = normSchema(s.items);
      return out;
    }

    const openAITools = (body.tools?.[0]?.functionDeclarations ?? []).map((fd: any) => ({
      type: "function",
      function: {
        name: fd.name,
        description: fd.description,
        parameters: normSchema(fd.parameters) ?? { type: "object", properties: {} },
      },
    }));


    const orBody: any = {
      model: "google/gemini-2.5-flash",
      messages,
      temperature: body.generationConfig?.temperature ?? 0.2,
      max_tokens: body.generationConfig?.maxOutputTokens ?? 1024,
    };
    if (openAITools.length > 0) orBody.tools = openAITools;

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
        "HTTP-Referer": "https://mvp-zerimar.vercel.app",
        "X-Title": "Zerimar Bot MVP",
      },
      body: JSON.stringify(orBody),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      throw new Error(`OpenRouter ${orRes.status}: ${errText}`);
    }

    const data = await orRes.json();
    const msg = data.choices?.[0]?.message;

    // ── C) Si el modelo llamó herramientas → convertir al formato Gemini ───────
    if (msg?.tool_calls?.length) {
      return {
        candidates: [
          {
            content: {
              role: "model",
              parts: msg.tool_calls.map((tc: any) => ({
                functionCall: {
                  name: tc.function.name,
                  args: (() => {
                    try {
                      return JSON.parse(tc.function.arguments || "{}");
                    } catch {
                      return {};
                    }
                  })(),
                },
              })),
            },
            finishReason: "STOP",
          },
        ],
        usageMetadata: { totalTokenCount: data.usage?.total_tokens ?? 0 },
      };
    }

    // ── D) Respuesta de texto normal ───────────────────────────────────────────
    return {
      candidates: [
        {
          content: { parts: [{ text: msg?.content || "" }], role: "model" },
          finishReason: "STOP",
        },
      ],
      usageMetadata: { totalTokenCount: data.usage?.total_tokens ?? 0 },
    };
  } catch (err) {
    lastError = err;
  }

  throw lastError;
}

export function textoDe(res: any): string {
  const parts: any[] = res?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
}
