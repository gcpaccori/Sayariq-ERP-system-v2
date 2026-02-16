-- Tabla para registrar pagos parciales de liquidaciones por lote
CREATE TABLE pagos_liquidacion (
  id SERIAL PRIMARY KEY,
  liquidacion_id INT NOT NULL REFERENCES liquidaciones(id) ON DELETE CASCADE,
  lote_id INT REFERENCES lotes(id) ON DELETE SET NULL,
  
  monto DECIMAL(10,2) NOT NULL,
  fecha DATE NOT NULL,
  forma_pago VARCHAR(50),
  numero_comprobante VARCHAR(50),
  comprobante_interno_id INT REFERENCES comprobantes_internos(id) ON DELETE SET NULL,
  
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX idx_pagos_liquidacion ON pagos_liquidacion(liquidacion_id);
CREATE INDEX idx_pagos_lote ON pagos_liquidacion(lote_id);
CREATE INDEX idx_pagos_fecha ON pagos_liquidacion(fecha);
CREATE INDEX idx_pagos_liquidacion_lote ON pagos_liquidacion(liquidacion_id, lote_id);
