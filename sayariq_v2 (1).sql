-- ============================================================================
-- SAYARIQ SYSTEM V2 — BASE DE DATOS LIMPIA
-- ============================================================================
-- 5 módulos, 0 views, 0 triggers, 0 stored procedures
-- Solo tablas, foreign keys, índices y datos semilla de categorías
--
-- MÓDULO 1: PERSONAS  (productores y clientes)
-- MÓDULO 2: ALMACÉN   (lotes, categorías, clasificación)
-- MÓDULO 3: PEDIDOS   (pedidos de clientes + asignación lote↔pedido)
-- MÓDULO 4: KARDEX    (entradas, salidas, calidades, deudas bidireccionales)
-- MÓDULO 5: LIQUIDACIONES (productor + cliente, comprobantes, detalle x categoría)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS sayariq_v2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sayariq_v2;

-- ============================================================================
-- MÓDULO 1: PERSONAS
-- ============================================================================
-- Una persona puede ser productor, cliente, o ambos.
-- Se usa una tabla de roles para flexibilidad.

CREATE TABLE personas (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(255)  NOT NULL,
  tipo_documento  ENUM('DNI','RUC','CE') NOT NULL DEFAULT 'DNI',
  documento       VARCHAR(20)   NOT NULL,
  telefono        VARCHAR(20)   NULL,
  email           VARCHAR(255)  NULL,
  direccion       TEXT          NULL,
  -- datos bancarios para pagos / cobros
  banco           VARCHAR(100)  NULL,
  cuenta_bancaria VARCHAR(50)   NULL,
  cci             VARCHAR(30)   NULL,
  estado          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_documento (tipo_documento, documento),
  INDEX idx_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE persona_roles (
  id          INT  AUTO_INCREMENT PRIMARY KEY,
  persona_id  INT  NOT NULL,
  rol         ENUM('productor','cliente') NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (persona_id) REFERENCES personas(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY uk_persona_rol (persona_id, rol)
) ENGINE=InnoDB;

-- ============================================================================
-- MÓDULO 2: ALMACÉN
-- ============================================================================
-- categorias = calidades/tipos en que se clasifica el producto
-- lotes      = cada cargamento que entra al almacén (de un productor)
-- lote_clasificacion = el detalle de cómo se clasificó el lote dentro del almacén

CREATE TABLE categorias (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  codigo      VARCHAR(20)   NOT NULL,
  nombre      VARCHAR(50)   NOT NULL,
  descripcion TEXT          NULL,
  precio_kg   DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Precio referencial por kg',
  orden       INT           NOT NULL DEFAULT 0,
  estado      ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_codigo (codigo),
  INDEX idx_orden (orden)
) ENGINE=InnoDB;

-- Datos semilla — calidades reales del negocio
INSERT INTO categorias (codigo, nombre, descripcion, precio_kg, orden) VALUES
  ('exportable', 'Exportable',  'Apto para exportación',                 8.50,  1),
  ('industrial', 'Industrial',  'Para procesamiento industrial',         3.50,  2),
  ('nacional',   'Nacional',    'Para mercado nacional',                 5.00,  3),
  ('jugo',       'Jugo',        'Para extracción / molido',              2.50,  4),
  ('descarte',   'Descarte',    'No apto para comercialización',         1.00,  5),
  ('primera',    'Primera',     'Primera calidad',                       7.00,  6),
  ('segunda',    'Segunda',     'Segunda calidad',                       5.50,  7),
  ('tercera',    'Tercera',     'Tercera calidad',                       4.00,  8),
  ('cuarta',     'Cuarta',      'Cuarta calidad',                        3.00,  9),
  ('quinta',     'Quinta',      'Quinta calidad',                        2.00, 10),
  ('dedos',      'Dedos',       'Raíces pequeñas o fragmentadas',        1.50, 11);

CREATE TABLE lotes (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  numero_lote     VARCHAR(50)   NOT NULL,
  productor_id    INT           NOT NULL,
  producto        VARCHAR(100)  NOT NULL,
  -- ingreso
  fecha_ingreso   DATE          NOT NULL,
  guia_ingreso    VARCHAR(50)   NULL COMMENT 'Guía de remisión del productor',
  peso_bruto_ingreso DECIMAL(10,2) NOT NULL COMMENT 'Peso total al ingresar al almacén',
  numero_jabas    INT           NULL DEFAULT 0,
  -- transporte
  chofer          VARCHAR(100)  NULL,
  placa_vehiculo  VARCHAR(20)   NULL,
  -- estado del lote dentro del almacén
  -- sin_clasificar: acaba de entrar, aún no se pesa por categoría
  -- clasificado:    ya se pesó y clasificó por categorías
  -- asignado:       ya se asignó a pedido(s)
  -- liquidado:      ya se liquidó al productor
  -- cancelado:      anulado
  estado          ENUM('sin_clasificar','clasificado','asignado','liquidado','cancelado')
                  NOT NULL DEFAULT 'sin_clasificar',
  observaciones   TEXT          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (productor_id) REFERENCES personas(id) ON UPDATE CASCADE,
  UNIQUE KEY uk_numero_lote (numero_lote),
  INDEX idx_estado (estado),
  INDEX idx_fecha (fecha_ingreso),
  INDEX idx_productor (productor_id)
) ENGINE=InnoDB;

-- Clasificación: cómo se repartió el peso del lote en categorías/calidades
-- Un lote puede tener N filas aquí (una por categoría encontrada)
CREATE TABLE lote_clasificacion (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  lote_id       INT           NOT NULL,
  categoria_id  INT           NOT NULL,
  peso_bruto    DECIMAL(10,2) NOT NULL COMMENT 'Peso bruto de esta categoría',
  numero_jabas  INT           NOT NULL DEFAULT 0,
  peso_jabas    DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Peso descontado por jabas',
  porcentaje_humedad DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  peso_descuento_humedad DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  peso_neto     DECIMAL(10,2) NOT NULL COMMENT 'Peso final = bruto - jabas - humedad',
  fecha_clasificacion DATE    NOT NULL,
  observaciones TEXT          NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (lote_id)      REFERENCES lotes(id)      ON UPDATE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON UPDATE CASCADE,
  UNIQUE KEY uk_lote_cat (lote_id, categoria_id),
  INDEX idx_lote (lote_id),
  INDEX idx_categoria (categoria_id)
) ENGINE=InnoDB;

-- ============================================================================
-- MÓDULO 3: PEDIDOS Y ASIGNACIÓN
-- ============================================================================
-- Un cliente hace un pedido.
-- A ese pedido se le asignan lotes (o fracciones de lotes) ya clasificados.

CREATE TABLE pedidos (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  numero_pedido   VARCHAR(50)   NOT NULL,
  cliente_id      INT           NOT NULL,
  producto        VARCHAR(100)  NOT NULL,
  categoria_id    INT           NULL COMMENT 'Categoría/calidad solicitada (puede ser NULL si acepta varias)',
  kg_solicitados  DECIMAL(10,2) NOT NULL,
  precio_kg       DECIMAL(10,2) NOT NULL COMMENT 'Precio pactado por kg',
  total_estimado  DECIMAL(10,2) NOT NULL COMMENT 'kg_solicitados × precio_kg',
  fecha_pedido    DATE          NOT NULL,
  fecha_entrega   DATE          NULL COMMENT 'Fecha comprometida de entrega',
  estado          ENUM('pendiente','en_proceso','completado','cancelado')
                  NOT NULL DEFAULT 'pendiente',
  observaciones   TEXT          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (cliente_id)   REFERENCES personas(id)    ON UPDATE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)  ON UPDATE CASCADE,
  UNIQUE KEY uk_numero_pedido (numero_pedido),
  INDEX idx_estado (estado),
  INDEX idx_cliente (cliente_id),
  INDEX idx_fecha (fecha_pedido)
) ENGINE=InnoDB;

-- Asignación: qué lote (y categoría) se asigna a qué pedido, y cuántos kg
CREATE TABLE pedido_asignaciones (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT           NOT NULL,
  lote_id         INT           NOT NULL,
  categoria_id    INT           NOT NULL,
  kg_asignados    DECIMAL(10,2) NOT NULL,
  precio_kg       DECIMAL(10,2) NOT NULL COMMENT 'Precio real de esta asignación',
  subtotal        DECIMAL(10,2) NOT NULL COMMENT 'kg_asignados × precio_kg',
  fecha_asignacion DATE         NOT NULL,
  observaciones   TEXT          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (pedido_id)    REFERENCES pedidos(id)     ON UPDATE CASCADE,
  FOREIGN KEY (lote_id)      REFERENCES lotes(id)       ON UPDATE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)  ON UPDATE CASCADE,
  INDEX idx_pedido (pedido_id),
  INDEX idx_lote (lote_id),
  INDEX idx_categoria (categoria_id)
) ENGINE=InnoDB;

-- ============================================================================
-- MÓDULO 4: KARDEX GENERAL
-- ============================================================================
-- El kardex registra TODO movimiento de producto y dinero.
-- No hay views: las consultas se hacen directo con JOINs y filtros.
--
-- PRODUCTO (tipo_kardex = 'producto'):
--   · ENTRADA  = lote ingresa al almacén (clasificado o sin clasificar)
--   · CLASIFICACION = la calidad en que se convirtió al clasificar
--   · SALIDA   = se asigna/vende a un pedido
--   · Cada movimiento lleva lote_id + categoria_id + peso_kg
--
-- DINERO (tipo_kardex = 'dinero'):
--   · INGRESO  = cobro por venta, devolución, etc.
--   · EGRESO   = pago a productor, adelanto, etc.
--   · Se rastrean deudas en ambos sentidos (productor↔empresa↔cliente)
--   · Cada movimiento lleva monto + saldo acumulado

CREATE TABLE kardex (
  id                INT           AUTO_INCREMENT PRIMARY KEY,
  fecha             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- tipo principal
  tipo_kardex       ENUM('producto','dinero') NOT NULL,

  -- dirección del movimiento
  -- producto: entrada, clasificacion, salida
  -- dinero:   ingreso, egreso
  tipo_movimiento   ENUM('entrada','clasificacion','salida','ingreso','egreso') NOT NULL,

  -- documento que origina el movimiento
  origen            ENUM('lote_ingreso','clasificacion','asignacion_pedido',
                         'liquidacion_productor','liquidacion_cliente',
                         'adelanto','pago_directo','ajuste') NOT NULL,
  origen_id         INT           NULL COMMENT 'ID del registro origen (lote, liquidacion, etc.)',
  origen_numero     VARCHAR(100)  NULL COMMENT 'Número legible del documento origen',

  -- producto: qué lote y categoría se mueve
  lote_id           INT           NULL,
  categoria_id      INT           NULL,
  peso_kg           DECIMAL(12,3) NULL DEFAULT 0.000,

  -- dinero: monto y forma
  monto             DECIMAL(12,2) NULL DEFAULT 0.00,
  -- a quién afecta la deuda / el cobro
  persona_id        INT           NULL,

  -- concepto descriptivo (generado por la app)
  concepto          VARCHAR(255)  NOT NULL,
  observaciones     TEXT          NULL,

  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- FK
  FOREIGN KEY (lote_id)      REFERENCES lotes(id)      ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (persona_id)   REFERENCES personas(id)   ON UPDATE CASCADE ON DELETE SET NULL,

  -- índices
  INDEX idx_fecha (fecha),
  INDEX idx_tipo_kardex (tipo_kardex),
  INDEX idx_tipo_mov (tipo_movimiento),
  INDEX idx_origen (origen, origen_id),
  INDEX idx_lote (lote_id),
  INDEX idx_categoria (categoria_id),
  INDEX idx_persona (persona_id),
  INDEX idx_fecha_tipo (fecha, tipo_kardex)
) ENGINE=InnoDB;

-- ============================================================================
-- MÓDULO 5: LIQUIDACIONES
-- ============================================================================
-- Hay 2 tipos de liquidación:
--   1. PRODUCTOR: se le paga al productor por su lote → genera EGRESO en kardex
--   2. CLIENTE:   se le cobra al cliente por su pedido → genera INGRESO en kardex
--
-- Cada liquidación tiene un detalle por categoría/calidad.
-- Las liquidaciones afectan el kardex (deudas, pagos, cobros).

CREATE TABLE liquidaciones (
  id                  INT           AUTO_INCREMENT PRIMARY KEY,
  numero_liquidacion  VARCHAR(50)   NOT NULL,
  tipo                ENUM('productor','cliente') NOT NULL,

  -- ¿a quién se le liquida?
  persona_id          INT           NOT NULL,
  -- ¿de qué lote/pedido?
  lote_id             INT           NULL COMMENT 'Para liquidaciones de productor',
  pedido_id           INT           NULL COMMENT 'Para liquidaciones de cliente',

  fecha_liquidacion   DATE          NOT NULL,

  -- comprobante
  serie_comprobante   VARCHAR(10)   NULL,
  numero_comprobante  VARCHAR(30)   NULL,
  tipo_comprobante    ENUM('factura','boleta','recibo','nota_credito','ninguno')
                      NULL DEFAULT 'ninguno',

  -- montos calculados
  total_bruto         DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Suma de subtotales de detalle',
  -- descuentos / costos (solo aplica en liquidación productor)
  costo_flete         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  costo_cosecha       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  costo_maquila       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  descuento_jabas     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  otros_descuentos    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_descuentos    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  -- adelantos ya dados al productor
  total_adelantos     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  -- monto final
  total_a_pagar       DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'total_bruto - descuentos - adelantos',

  -- estado del pago/cobro
  estado              ENUM('borrador','confirmada','anulada') NOT NULL DEFAULT 'borrador',
  estado_pago         ENUM('pendiente','parcial','pagado','cobrado') NOT NULL DEFAULT 'pendiente',
  forma_pago          ENUM('efectivo','transferencia','cheque','mixto') NULL,
  monto_pagado        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha_pago          DATE          NULL,

  observaciones       TEXT          NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (persona_id) REFERENCES personas(id)  ON UPDATE CASCADE,
  FOREIGN KEY (lote_id)    REFERENCES lotes(id)      ON UPDATE CASCADE,
  FOREIGN KEY (pedido_id)  REFERENCES pedidos(id)    ON UPDATE CASCADE,

  UNIQUE KEY uk_numero_liq (numero_liquidacion),
  INDEX idx_tipo (tipo),
  INDEX idx_persona (persona_id),
  INDEX idx_estado (estado),
  INDEX idx_estado_pago (estado_pago),
  INDEX idx_fecha (fecha_liquidacion)
) ENGINE=InnoDB;

-- Detalle de liquidación: una fila por categoría/calidad liquidada
CREATE TABLE liquidacion_detalle (
  id                  INT           AUTO_INCREMENT PRIMARY KEY,
  liquidacion_id      INT           NOT NULL,
  categoria_id        INT           NOT NULL,
  -- pesos
  peso_bruto          DECIMAL(10,2) NOT NULL,
  numero_jabas        INT           NOT NULL DEFAULT 0,
  peso_jabas          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  porcentaje_humedad  DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  peso_descuento_humedad DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  peso_neto           DECIMAL(10,2) NOT NULL COMMENT 'Peso final después de descuentos',
  -- precio y subtotal
  precio_kg           DECIMAL(10,2) NOT NULL,
  subtotal            DECIMAL(10,2) NOT NULL COMMENT 'peso_neto × precio_kg',
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (categoria_id)   REFERENCES categorias(id)    ON UPDATE CASCADE,
  INDEX idx_liquidacion (liquidacion_id),
  INDEX idx_categoria (categoria_id)
) ENGINE=InnoDB;

-- Adelantos: dinero dado por adelantado al productor (se descuenta en liquidación)
CREATE TABLE adelantos (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  productor_id    INT           NOT NULL,
  lote_id         INT           NULL COMMENT 'Si el adelanto va contra un lote específico',
  monto           DECIMAL(10,2) NOT NULL,
  fecha           DATE          NOT NULL,
  motivo          TEXT          NULL,
  -- pendiente: aún no se descontó
  -- aplicado:  ya se descontó en una liquidación
  -- cancelado: se anuló
  estado          ENUM('pendiente','aplicado','cancelado') NOT NULL DEFAULT 'pendiente',
  liquidacion_id  INT           NULL COMMENT 'Liquidación en la que se aplicó',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (productor_id)   REFERENCES personas(id)       ON UPDATE CASCADE,
  FOREIGN KEY (lote_id)        REFERENCES lotes(id)          ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones(id)  ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_productor (productor_id),
  INDEX idx_estado (estado),
  INDEX idx_lote (lote_id)
) ENGINE=InnoDB;

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
-- Total: 10 tablas limpias, 0 views, 0 triggers, 0 stored procedures
--
-- FLUJO DEL NEGOCIO:
--
-- 1. PERSONAS: se registra productor o cliente (o ambos)
--
-- 2. ALMACÉN:
--    a. Productor entrega producto → se crea LOTE (estado=sin_clasificar)
--    b. → KARDEX: entrada de producto (peso bruto)
--    c. En almacén se clasifica → se crean filas en LOTE_CLASIFICACION
--    d. → KARDEX: movimiento tipo 'clasificacion' por cada categoría
--    e. LOTE pasa a estado 'clasificado'
--
-- 3. PEDIDOS:
--    a. Cliente hace pedido → se crea PEDIDO
--    b. Se asignan lotes clasificados al pedido → PEDIDO_ASIGNACIONES
--    c. → KARDEX: salida de producto (por cada asignación)
--    d. LOTE pasa a estado 'asignado'
--
-- 4. KARDEX GENERAL:
--    · Registra TODAS las entradas y salidas de producto
--    · Registra TODOS los movimientos de dinero (adelantos, pagos, cobros)
--    · Permite ver qué calidades tiene cada lote (saldos por categoría)
--    · Permite ver qué lotes sobran y cuáles están agotados
--    · Permite ver deudas: empresa→productor y cliente→empresa
--    · NO tiene views: se consulta con queries directos
--
-- 5. LIQUIDACIONES:
--    a. PRODUCTOR: se liquida un lote → se calcula por categoría → EGRESO en kardex
--       - Se descuentan adelantos, fletes, cosecha, maquila, jabas
--       - Se genera comprobante
--    b. CLIENTE: se liquida un pedido → se calcula por categoría → INGRESO en kardex
--       - El cliente paga (o queda debiendo)
--       - Se genera comprobante
--
-- DEUDAS (dinero desfasado):
--    · El productor puede recibir adelantos SIN entregar producto aún
--    · El productor puede entregar producto SIN recibir pago aún (contraentrega)
--    · El cliente puede recibir producto SIN pagar aún
--    · Todo se rastrea en KARDEX tipo 'dinero' con persona_id
--    · Saldo negativo = la empresa le debe a esa persona
--    · Saldo positivo = esa persona le debe a la empresa
-- ============================================================================
