import { Inngest } from "inngest";
import { procesarConversacion } from "./bot";

export const inngest = new Inngest({
  id: "zerimar-rocafrut-bot",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  isDev: process.env.NODE_ENV === "development" && process.env.INNGEST_DEV === "1",
});

// Debounce: espera 5 s de silencio después del ÚLTIMO mensaje para agrupar todos los mensajes consecutivos en una sola respuesta.
export const procesarChat = inngest.createFunction(
  {
    id: "procesar-chat",
    debounce: { key: "event.data.conversacionId", period: "5s", timeout: "20s" },
    concurrency: { key: "event.data.conversacionId", limit: 1 },
    retries: 1,
  },
  { event: "chat/mensaje" },
  async ({ event, step }) => {
    return step.run("responder", () => procesarConversacion(Number(event.data.conversacionId)));
  }
);
