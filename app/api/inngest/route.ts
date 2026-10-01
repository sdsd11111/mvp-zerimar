import { serve } from "inngest/next";
import { inngest, procesarChat } from "@/lib/inngest";

export const maxDuration = 60;
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [procesarChat],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
