-- Tabla para registrar pagos parciales de liquidaciones por lote
-- Permite trazabilidad completa de cada pago sin lógica de descuento automático

CREATE TABLE pagos_liquidacion (
  id SERIAL PRIMARY KEY,
  liquidacion_id INT NOT NULL REFERENCES liquidaciones(id) ON DELETE CASCADE,
  lote_id INT REFERENCES lotes(id) ON DELETE SET NULL,
  
  monto DECIMAL(10,2) NOT NULL COMMENT 'Monto pagado/cobrado en este registro',
  fecha DATE NOT NULL COMMENT 'Fecha del pago',
  forma_pago VARCHAR(50) COMMENT 'efectivo, transferencia, cheque, mixto, etc.',
  numero_comprobante VARCHAR(50) COMMENT 'Referencia de comprobante bancario/interno',
  comprobante_interno_id INT REFERENCES comprobantes_internos(id) ON DELETE SET NULL,
  
  observaciones TEXT COMMENT 'Notas del administrador (decisión respecto adelantos, etc.)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_liquidacion (liquidacion_id),
  INDEX idx_lote (lote_id),
  INDEX idx_fecha (fecha),
  INDEX idx_liquidacion_lote (liquidacion_id, lote_id)
);

-- Comentario de tabla
ALTER TABLE pagos_liquidacion COMMENT = 'Historial detallado de pagos/cobros parciales de liquidaciones. Cada fila es un acto de pago sin aplicar lógica de descuentos automáticos.';
