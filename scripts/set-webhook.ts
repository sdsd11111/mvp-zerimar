// Registra el webhook en Evolution:  npm run webhook
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { EVOLUTION_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, APP_URL, WEBHOOK_SECRET } = process.env;
  const url = `${APP_URL}/api/webhook?secret=${WEBHOOK_SECRET}`;
  const r = await fetch(`${EVOLUTION_URL}/webhook/set/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY! },
    body: JSON.stringify({ webhook: { enabled: true, url, byEvents: false, base64: false, events: ["MESSAGES_UPSERT"] } }),
  });
  console.log(r.status, await r.text());
}
main();
