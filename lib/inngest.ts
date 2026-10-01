import { Inngest } from "inngest";
import { procesarConversacion } from "./bot";

export const inngest = new Inngest({
  id: "zerimar-rocafrut-bot",
  signingKey: process.env.INNGEST_SIGNING_KEY,
  isDev: process.env.NODE_ENV === "development" && process.env.INNGEST_DEV === "1",
});

// Debounce: espera 3 s despues del ULTIMO mensaje. Concurrency: 1 a la vez por conversacion.
export const procesarChat = inngest.createFunction(
  {
    id: "procesar-chat",
    debounce: { key: "event.data.conversacionId", period: "3s", timeout: "20s" },
    concurrency: { key: "event.data.conversacionId", limit: 1 },
    retries: 1,
  },
  { event: "chat/mensaje" },
  async ({ event, step }) => {
    return step.run("responder", () => procesarConversacion(Number(event.data.conversacionId)));
  }
);
