-- Chatbot Zerimar / Rocafrut - esquema MVP (MySQL 5.7+ / 8)
SET NAMES utf8mb4;

-- ========== CRM / CONVERSACIONES ==========
CREATE TABLE IF NOT EXISTS bot_contactos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  telefono VARCHAR(32) NOT NULL,
  nombre VARCHAR(120) NULL,
  datos JSON NULL,                       -- datos capturados: cedula, correo, ciudad, etc.
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_telefono (telefono)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bot_conversaciones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contacto_id BIGINT UNSIGNED NOT NULL,
  empresa ENUM('zerimar','rocafrut') NULL,          -- marca con la que habla (NULL = aun no se sabe)
  estado VARCHAR(32) NOT NULL DEFAULT 'SALUDO',      -- lo controla el CODIGO, no el modelo
  bot_activo TINYINT(1) NOT NULL DEFAULT 1,
  resumen TEXT NULL,                                 -- resumen rodante estructurado (JSON como texto)
  resumen_hasta_msg_id BIGINT UNSIGNED NULL,
  intentos_fallidos INT NOT NULL DEFAULT 0,
  procesando TINYINT(1) NOT NULL DEFAULT 0,          -- lock de seguridad
  lock_at DATETIME NULL,
  motivo_escalamiento VARCHAR(255) NULL,
  resumen_agente TEXT NULL,                          -- resumen que lee el asesor al tomar el chat
  asignado_a VARCHAR(80) NULL,
  ultimo_msg_en DATETIME(3) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_contacto (contacto_id),
  KEY idx_estado (estado, bot_activo),
  CONSTRAINT fk_conv_contacto FOREIGN KEY (contacto_id) REFERENCES bot_contactos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bot_mensajes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversacion_id BIGINT UNSIGNED NOT NULL,
  rol ENUM('cliente','bot','agente') NOT NULL,
  texto TEXT NOT NULL,
  wa_message_id VARCHAR(128) NULL,
  procesado TINYINT(1) NOT NULL DEFAULT 0,           -- mensajes del cliente ya atendidos por el bot
  creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_wa_msg (wa_message_id),              -- deduplica webhooks repetidos
  KEY idx_conv_id (conversacion_id, id),
  KEY idx_pendientes (conversacion_id, rol, procesado),
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversacion_id) REFERENCES bot_conversaciones(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== CONOCIMIENTO (el bot SOLO lo lee via tools) ==========
CREATE TABLE IF NOT EXISTS bot_sucursales (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa ENUM('zerimar','rocafrut') NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  ciudad VARCHAR(80) NOT NULL,
  telefono VARCHAR(40) NULL,
  horario JSON NOT NULL,                              -- {"lun-sab":"09:00-21:00","dom":"09:00-20:00"}
  activa TINYINT(1) NOT NULL DEFAULT 1,
  KEY idx_emp_ciudad (empresa, ciudad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bot_promociones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa ENUM('zerimar','rocafrut','ambas') NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  descripcion TEXT NOT NULL,
  desde DATE NOT NULL,
  hasta DATE NOT NULL,
  activa TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bot_productos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa ENUM('zerimar','rocafrut','ambas') NOT NULL DEFAULT 'ambas',
  nombre VARCHAR(160) NOT NULL,
  descripcion VARCHAR(255) NULL,
  categoria VARCHAR(60) NOT NULL,
  precio DECIMAL(8,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  FULLTEXT KEY ft_prod (nombre, descripcion, categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bot_faqs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa ENUM('zerimar','rocafrut','ambas') NOT NULL DEFAULT 'ambas',
  tema VARCHAR(60) NOT NULL,
  pregunta VARCHAR(255) NOT NULL,
  respuesta TEXT NOT NULL,
  FULLTEXT KEY ft_faq (tema, pregunta, respuesta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bot_config (
  clave VARCHAR(60) PRIMARY KEY,
  valor JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== DEPURACION ==========
CREATE TABLE IF NOT EXISTS bot_trazas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversacion_id BIGINT UNSIGNED NOT NULL,
  prompt JSON NULL,              -- contexto exacto enviado al modelo
  respuesta JSON NULL,
  tools_llamadas JSON NULL,      -- [{nombre, args, resultado}]
  bloqueada TINYINT(1) NOT NULL DEFAULT 0,  -- la validacion anti-alucinacion la freno
  tokens INT NULL,
  latencia_ms INT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_conv (conversacion_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bot_eventos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversacion_id BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(40) NOT NULL,     -- escalado | cerrado | dato_capturado | error | reactivado
  detalle JSON NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_conv (conversacion_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
