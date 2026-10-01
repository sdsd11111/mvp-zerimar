import { Inngest } from "inngest";
import { procesarConversacion } from "./bot";

export const inngest = new Inngest({
  id: "zerimar-rocafrut-bot",
  signingKey: process.env.INNGEST_SIGNING_KEY,
  isDev: process.env.NODE_ENV === "development" && process.env.INNGEST_DEV === "1",
});

// Debounce: espera 10 s de silencio despues del ULTIMO mensaje para encolar todo. Concurrency: 1 a la vez por conversacion.
export const procesarChat = inngest.createFunction(
  {
    id: "procesar-chat",
    debounce: { key: "event.data.conversacionId", period: "10s", timeout: "40s" },
    concurrency: { key: "event.data.conversacionId", limit: 1 },
    retries: 1,
  },
  { event: "chat/mensaje" },
  async ({ event, step }) => {
    return step.run("responder", () => procesarConversacion(Number(event.data.conversacionId)));
  }
);
