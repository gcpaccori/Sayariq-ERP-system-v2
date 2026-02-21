# Módulo 10: Clasificación Neta (CRUT de lotes, Kardex y enfoque en jabas)

## 1) Análisis de negocio (situación actual y brecha)

### Lo que ya existe
- El lote entra por almacén con `peso_bruto_ingreso` y `numero_jabas`.
- La clasificación actual registra peso por categoría en `lote_clasificacion`.
- Se insertan movimientos de clasificación en `kardex` al guardar la clasificación.
- La liquidación del productor usa la trazabilidad del lote ingresado.
- La liquidación del cliente se basa en el producto efectivamente vendido.

### Brecha identificada para el nuevo requerimiento
1. **No existe un ciclo formal de “clasificación neta” versionable** (editar clasificación sin perder historial).
2. **No se controla explícitamente la variación total del lote al cerrar clasificación** (ganó/perdió kg por humedad, tierra, negociación u otros factores).
3. **No hay bitácora completa de modificaciones** (cuántas veces, cuándo y quién modificó).
4. **No hay trazabilidad de jabas por proceso** separando ingreso vs clasificación final.
5. **No hay señal transaccional explícita “almacén → kardex por clasificación neta cerrada”** para facilitar auditoría contable-operativa.

---

## 2) Objetivo funcional del Módulo 10

Implementar un módulo adicional de **Clasificación Neta** que:
- Mantenga la liquidación al productor sobre el lote registrado al ingreso (base origen).
- Mantenga la liquidación al cliente sobre el peso real post-clasificación (base comercial).
- Registre variaciones de peso del lote al cerrar clasificación.
- Registre historial completo de ediciones de clasificación (contador + usuario + fecha + motivo).
- Refuerce el paso de almacén a kardex con trazabilidad de proceso (sin romper módulos existentes).

---

## 3) Reglas de negocio propuestas

1. **Un lote puede tener múltiples versiones de clasificación**, pero solo una versión vigente por categoría.
2. **Cada edición incrementa versión** del proceso de clasificación del lote.
3. **Toda edición crea auditoría obligatoria** (`quién`, `cuándo`, `motivo`, `antes`, `después`).
4. **La variación se calcula al cierre**:
   - `variacion_kg = peso_neto_total_clasificado - peso_bruto_ingreso`
   - `variacion_pct = variacion_kg / peso_bruto_ingreso * 100`
5. **Jabas en enfoque operativo**:
   - Jabas de ingreso (`lotes.numero_jabas`) se conservan como dato de recepción.
   - Jabas de clasificación se consolidan en resumen de proceso para medir diferencia de manejo.
6. **Kardex producto**:
   - Mantener movimientos de entrada por lote.
   - Registrar/actualizar movimientos de clasificación vigentes por categoría.
   - Registrar un movimiento de ajuste de clasificación cuando haya recalculo por edición.
7. **No romper funcionamiento actual**:
   - Cambios aditivos o compatibles.
   - Migración progresiva por feature flag operativo.

---

## 4) Diseño de datos (alto nivel)

### Nuevas entidades
- `clasificacion_neta_proceso`
  - Cabecera del proceso por lote (versión actual, estado, conteo de modificaciones, resumen de pesos/jabas).
- `lote_variacion_peso`
  - Registro explícito de variación final por cierre o por edición relevante.
- `lote_clasificacion_auditoria`
  - Bitácora de cambios por fila de clasificación.

### Ajustes compatibles en tabla existente
- `lote_clasificacion`
  - Añadir versionado (`version_no`), estado vigente (`es_vigente`), referencia a proceso, y metadata de usuario.
  - Reemplazar unicidad rígida `(lote_id, categoria_id)` por unicidad parcial vigente.

---

## 5) Integración con Kardex (propuesta)

1. **Ingreso de lote (sin cambio)**
   - Se mantiene `kardex.tipo_movimiento = 'entrada'` con origen `lote_ingreso`.

2. **Clasificación neta inicial**
   - Insertar detalle versión 1 por categoría en `lote_clasificacion`.
   - Insertar movimientos `kardex` de tipo `clasificacion` origen `clasificacion`.

3. **Edición de clasificación**
   - Marcar filas vigentes previas como `es_vigente = false`.
   - Insertar nuevas filas con `version_no = version_actual + 1`.
   - Insertar auditoría por cambio.
   - Insertar movimiento kardex de ajuste (`tipo_movimiento='clasificacion'`, `origen='ajuste'`) con diferencia neta.

4. **Cierre de clasificación neta**
   - Persistir resumen en `clasificacion_neta_proceso`.
   - Registrar `lote_variacion_peso`.
   - Mantener lote en estado `clasificado` (o subestado operativo si luego lo habilitan).

---

## 6) Plan maestro de ejecución (sin afectar operación vigente)

## Fase 0 — Preparación (1-2 días)
- Levantar inventario de lotes activos y clasificaciones vigentes.
- Identificar usuarios/personas que podrán editar clasificación.
- Definir catálogo de motivos de modificación.

## Fase 1 — Base de datos (2-3 días)
- Ejecutar script SQL del módulo 10 (adjunto en `sql/20260220_modulo10_clasificacion_neta.sql`).
- Backfill de `clasificacion_neta_proceso` para lotes con clasificación histórica.
- Validar constraints e índices.

## Fase 2 — Lógica de aplicación (3-5 días)
- Crear servicio transaccional para:
  - guardar clasificación,
  - editar clasificación,
  - recalcular resumen,
  - actualizar kardex,
  - auditar cambios.
- Mantener compatibilidad con pantallas actuales de almacén.

## Fase 3 — UI/UX Módulo 10 (3-4 días)
- Nueva pantalla “Módulo 10 · Clasificación Neta”.
- Vista comparativa: ingreso vs clasificación vigente vs variación.
- Historial de modificaciones (contador + tabla de eventos).

## Fase 4 — QA funcional y contable (2-3 días)
- Casos: lote gana peso, pierde peso, edición múltiple, cambios por jabas/humedad.
- Cuadre: Kardex producto vs detalle clasificación vigente.
- Cuadre: liquidación productor (origen) vs liquidación cliente (salida neta).

## Fase 5 — Despliegue gradual (1-2 días)
- Activar primero para un subconjunto de lotes.
- Monitorear diferencias y rendimiento.
- Activación completa tras validación.

---

## 7) KPIs de control recomendados
- `% lotes con variación > ±3%`
- `kg netos clasificados / kg brutos ingresados`
- `promedio de modificaciones por lote`
- `tiempo promedio de cierre de clasificación`
- `diferencia kardex vs clasificación vigente (debe tender a 0)`

---

## 8) Riesgos y mitigaciones
- **Riesgo:** doble fuente de verdad entre clasificaciones antiguas y nuevas.  
  **Mitigación:** usar `es_vigente` + vista SQL de vigentes.

- **Riesgo:** edición masiva distorsiona kardex histórico.  
  **Mitigación:** registrar solo deltas de ajuste con auditoría y timestamp.

- **Riesgo:** usuarios editan sin motivo.  
  **Mitigación:** `motivo` obligatorio en modificación.

---

## 9) Criterio de éxito del módulo
Se considera implementado cuando:
1. El lote muestra su variación final de peso y jabas.
2. Kardex refleja clasificación vigente + ajustes por edición.
3. Se puede consultar cuántas veces se editó una clasificación, cuándo y por quién.
4. Liquidación productor y cliente conviven sin contradicción de reglas.
