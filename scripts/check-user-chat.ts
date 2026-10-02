import { config } from "dotenv";
config({ path: ".env.local" });
import { q } from "../lib/db";

async function main() {
  const num = "967491847";
  const contacts = await q<any>(`SELECT * FROM bot_contactos WHERE telefono LIKE ?`, [`%${num}%`]);
  console.log("CONTACTS:", JSON.stringify(contacts, null, 2));

  if (contacts.length > 0) {
    const cIds = contacts.map((c: any) => c.id);
    const convs = await q<any>(`SELECT c.*, ct.telefono, ct.nombre FROM bot_conversaciones c JOIN bot_contactos ct ON ct.id=c.contacto_id WHERE c.contacto_id IN (?)`, [cIds]);
    console.log("CONVERSACIONES:", JSON.stringify(convs, null, 2));
  }

  const ultimasConvs = await q<any>(`
    SELECT c.id, c.ultimo_msg_en, ct.nombre, ct.telefono 
    FROM bot_conversaciones c 
    JOIN bot_contactos ct ON ct.id=c.contacto_id 
    ORDER BY c.ultimo_msg_en DESC LIMIT 10
  `);
  console.log("TOP 10 ULTIMAS CONVS EN DB:", JSON.stringify(ultimasConvs, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
