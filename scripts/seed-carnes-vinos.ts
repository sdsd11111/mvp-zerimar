import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  console.log("Insertando carnes, vinos y promociones para el demo...");

  // 1. Nuevas promociones activas
  await conn.query(`
    INSERT INTO bot_promociones (empresa, titulo, descripcion, desde, hasta, activa) VALUES
    ('zerimar', 'Viernes de Vinos y Licores', '5% de descuento en vinos tintos, blancos y licores seleccionados todos los viernes.', '2026-01-01', '2026-12-31', 1),
    ('zerimar', 'Martes Rojo de Carnes', '5% de descuento en cortes de res y cerdo seleccionados.', '2026-01-01', '2026-12-31', 1),
    ('zerimar', 'Miércoles de Pollo Fresco', '10% de descuento en pollo entero y presas seleccionadas.', '2026-01-01', '2026-12-31', 1)
    ON DUPLICATE KEY UPDATE descripcion=VALUES(descripcion), activa=1;
  `);

  // 2. Productos: Carnes, Pollo, Vinos y Licores
  const productos = [
    // Vinos & Licores
    ['zerimar', 'Vino Tinto Casillero del Diablo Cabernet 750 ml', 'Vino tinto chileno reserva', 'Licores y Vinos', 12.50, 45],
    ['zerimar', 'Vino Tinto Concha y Toro Reservado 750 ml', 'Vino tinto varietal', 'Licores y Vinos', 8.20, 60],
    ['zerimar', 'Vino Blanco Santa Helena Sauvignon Blanc 750 ml', 'Vino blanco chileno', 'Licores y Vinos', 7.50, 35],
    ['zerimar', 'Vino Tinto Malbec Trapiche 750 ml', 'Vino tinto argentino', 'Licores y Vinos', 11.00, 30],
    ['zerimar', 'Whisky Johnnie Walker Red Label 750 ml', 'Whisky escocés', 'Licores y Vinos', 21.50, 25],
    ['zerimar', 'Cerveza Club Premium 330 ml (six pack)', 'Cerveza nacional en lata', 'Licores y Vinos', 6.50, 80],
    
    // Carnes Rojas y Embutidos Zerimar
    ['zerimar', 'Lomo fino de res (libra)', 'Corte tierno de res de primera', 'Carnes', 4.50, 50],
    ['zerimar', 'Bife de res / costilla (libra)', 'Corte fresco para asados', 'Carnes', 3.80, 70],
    ['zerimar', 'Carne molida especial de res (libra)', 'Carne molida magra fresca', 'Carnes', 3.20, 90],
    ['zerimar', 'Costilla de cerdo (libra)', 'Corte fresco de cerdo para hornear o asar', 'Carnes', 3.40, 40],
    ['zerimar', 'Chuleta de cerdo (libra)', 'Chuleta fresca de cerdo', 'Carnes', 3.10, 60],
    ['zerimar', 'Pollo entero fresco (libra)', 'Pollo limpio de granja', 'Carnes', 1.45, 120],
    ['zerimar', 'Pechuga de pollo (libra)', 'Pechuga deshuesada fresca', 'Carnes', 2.30, 85],
    ['zerimar', 'Muslos de pollo (libra)', 'Presas frescas de pollo', 'Carnes', 1.60, 95],
    ['zerimar', 'Embutido artesanal Zerimar (paquete 500 g)', 'Chorizo parrillero artesanal de la casa', 'Carnes', 4.20, 55],
  ];

  for (const p of productos) {
    await conn.query(
      `INSERT INTO bot_productos (empresa, nombre, descripcion, categoria, precio, stock, activo)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE precio=VALUES(precio), stock=VALUES(stock), activo=1`,
      p
    );
  }

  console.log("¡Productos y promociones agregados con éxito!");
  await conn.end();
}

main().catch(console.error);
