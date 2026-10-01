-- DATOS DEMO. Sucursales basadas en directorios publicos (pueden estar desactualizadas).
-- Promociones, productos, precios y stock son INVENTADOS para el MVP.
SET NAMES utf8mb4;

DELETE FROM bot_sucursales;
DELETE FROM bot_promociones;
DELETE FROM bot_productos;
DELETE FROM bot_faqs;
DELETE FROM bot_config;

-- ---------- SUCURSALES ----------
INSERT INTO bot_sucursales (empresa, nombre, direccion, ciudad, telefono, horario) VALUES
('zerimar','Zerimar Matriz Ancón','Ancón Tena y Av. Gran Colombia','Loja','(07) 258-8083','{"lun-sab":"08:30-21:00","dom":"09:00-20:00"}'),
('zerimar','Zerimar 8 de Diciembre','Av. 8 de Diciembre y Jaime Roldós Aguilera','Loja','(07) 258-8083','{"lun-dom":"09:00-21:15"}'),
('zerimar','Zerimar Centro','18 de Noviembre y Miguel Riofrío','Loja','(07) 258-8083','{"lun-sab":"08:30-20:30","dom":"09:00-19:00"}'),
('zerimar','Zerimar Machala','Batalla de Tarqui y Av. Simón Bolívar','Machala','(07) 258-8083','{"lun-dom":"09:00-20:30"}'),
('rocafrut','Rocafrut Centro','José María Peña 11-68 y Mercadillo','Loja','(07) 258-8083','{"lun-sab":"08:00-20:00","dom":"09:00-14:00"}'),
('rocafrut','Rocafrut Macará','Calle Macará','Loja','(07) 258-8083','{"lun-sab":"08:00-20:00","dom":"09:00-14:00"}'),
('rocafrut','Rocafrut Arupos','Sector Arupos','Loja','(07) 258-8083','{"lun-sab":"08:00-20:00","dom":"09:00-14:00"}'),
('rocafrut','Rocafrut Av. Salvador Bustamante Celi','Av. Salvador Bustamante Celi','Loja','(07) 258-8083','{"lun-sab":"08:00-20:30","dom":"09:00-15:00"}');

-- ---------- PROMOCIONES (inventadas) ----------
INSERT INTO bot_promociones (empresa, titulo, descripcion, desde, hasta) VALUES
('zerimar','Combo Despensa','Arroz 2 kg + azúcar 2 kg + aceite 1 L a precio especial de $7.50.','2026-09-25','2026-10-15'),
('zerimar','Lácteos al 15%','15% de descuento en leche, yogur y quesos todos los martes.','2026-09-01','2026-12-31'),
('rocafrut','Fruta fresca 2x1','Lleva 2 libras de fruta de temporada y paga 1, solo viernes.','2026-09-20','2026-10-31'),
('rocafrut','Jugos naturales','Segundo jugo natural con 50% de descuento.','2026-09-15','2026-10-20'),
('ambas','Pago con tarjeta sin recargo','Sin recargo adicional al pagar con tarjeta de crédito o débito.','2026-01-01','2026-12-31'),
('ambas','Mes de la panadería','Pan fresco: lleva 12 y paga 10 en panadería.','2026-10-01','2026-10-31');

-- ---------- PRODUCTOS (inventados) ----------
INSERT INTO bot_productos (empresa, nombre, descripcion, categoria, precio, stock) VALUES
('zerimar','Arroz blanco 2 kg','Arroz grano largo','Víveres',2.40,120),
('zerimar','Azúcar blanca 2 kg','Azúcar refinada','Víveres',2.20,90),
('zerimar','Aceite vegetal 1 L','Aceite de cocina','Víveres',3.10,75),
('zerimar','Fideo tallarín 400 g','Pasta seca','Víveres',1.05,140),
('zerimar','Atún en lata 170 g','Atún en aceite','Víveres',1.60,200),
('zerimar','Lentejas 500 g','Legumbre seca','Víveres',1.30,60),
('zerimar','Harina de trigo 1 kg','Harina multiuso','Víveres',1.25,80),
('zerimar','Sal yodada 1 kg','Sal de mesa','Víveres',0.70,150),
('zerimar','Leche entera 1 L','Leche UHT','Lácteos',1.15,180),
('zerimar','Yogur natural 1 L','Yogur sin azúcar','Lácteos',2.35,45),
('zerimar','Queso fresco 500 g','Queso fresco de la zona','Lácteos',3.80,30),
('zerimar','Mantequilla 250 g','Mantequilla con sal','Lácteos',2.10,40),
('zerimar','Detergente en polvo 1 kg','Para ropa','Hogar',3.50,70),
('zerimar','Lavavajillas 750 ml','Líquido concentrado','Hogar',2.25,85),
('zerimar','Papel higiénico 12 rollos','Doble hoja','Hogar',4.90,100),
('zerimar','Cloro 1 L','Desinfectante','Hogar',1.10,110),
('zerimar','Licuadora 600 W','Vaso de vidrio 1.5 L','Electrodomésticos',39.90,12),
('zerimar','Arrocera eléctrica 1.8 L','Con función de mantener caliente','Electrodomésticos',34.50,8),
('zerimar','Plancha a vapor','1200 W','Electrodomésticos',22.00,0),
('zerimar','Olla a presión 6 L','Aluminio','Electrodomésticos',28.90,15),
('ambas','Pan de agua (unidad)','Pan fresco del día','Panadería',0.15,300),
('ambas','Pan integral 500 g','Pan de molde integral','Panadería',2.05,40),
('ambas','Empanadas de queso (unidad)','Horneadas','Panadería',0.80,60),
('ambas','Gaseosa 2 L','Botella retornable','Bebidas',1.85,130),
('ambas','Agua sin gas 600 ml','Botella','Bebidas',0.50,250),
('ambas','Jugo natural de naranja 1 L','Exprimido del día','Bebidas',2.50,25),
('rocafrut','Banano (libra)','Fruta fresca','Frutas',0.35,200),
('rocafrut','Manzana roja (libra)','Fruta fresca','Frutas',1.10,90),
('rocafrut','Naranja (libra)','Fruta fresca','Frutas',0.45,150),
('rocafrut','Mora (libra)','Fruta fresca','Frutas',1.80,35),
('rocafrut','Piña (unidad)','Fruta fresca','Frutas',1.50,40),
('rocafrut','Tomate riñón (libra)','Hortaliza fresca','Verduras',0.65,80),
('rocafrut','Cebolla paiteña (libra)','Hortaliza fresca','Verduras',0.70,100),
('rocafrut','Papa chola (libra)','Tubérculo fresco','Verduras',0.40,160),
('rocafrut','Zanahoria (libra)','Hortaliza fresca','Verduras',0.35,90),
('rocafrut','Aguacate (unidad)','Fruta fresca','Frutas',0.60,70);

-- ---------- FAQS (inventadas, razonables para un supermercado) ----------
INSERT INTO bot_faqs (empresa, tema, pregunta, respuesta) VALUES
('ambas','pagos','¿Qué formas de pago aceptan?','Aceptamos efectivo y tarjetas de crédito y débito, sin recargo adicional.'),
('ambas','factura','¿Emiten factura con datos?','Sí. Indica tu cédula o RUC al momento de pagar y emitimos la factura con tus datos.'),
('zerimar','domicilio','¿Tienen entrega a domicilio?','Por ahora, en este demo, la entrega a domicilio la coordina un asesor. Puedo pasarte con uno.'),
('ambas','empleo','¿Cómo trabajo con ustedes?','Puedes entregar tu hoja de vida en físico en cualquiera de nuestras sucursales o enviarla de forma digital. Si quieres, te conecto con un asesor para indicarte a dónde enviarla.'),
('ambas','devoluciones','¿Puedo devolver un producto?','Las devoluciones y reclamos los gestiona un asesor, que revisará tu caso. Te paso con uno si deseas.'),
('rocafrut','frescura','¿Cuándo llega la fruta fresca?','La fruta y verdura se reponen a diario. Para disponibilidad de un producto puntual, dime cuál y lo reviso.'),
('ambas','horarios_feriados','¿Atienden en feriados?','El horario en feriados puede variar por sucursal. Un asesor puede confirmártelo.'),
('ambas','mayorista','¿Venden al por mayor?','Zerimar trabaja también venta por mayor. Para cotizaciones, te paso con un asesor.'),
('ambas','contacto','¿Cuál es su teléfono?','Puedes llamarnos al (07) 258-8083 o escribirnos aquí por WhatsApp.');

-- ---------- CONFIG ----------
INSERT INTO bot_config (clave, valor) VALUES
('horario_asesores','{"zona":"America/Guayaquil","lun-sab":["08:30","18:00"],"dom":null}'),
('mensaje_fuera_horario','"Nuestros asesores atienden de lunes a sábado de 08:30 a 18:00. Te responderán apenas inicien su jornada."');
