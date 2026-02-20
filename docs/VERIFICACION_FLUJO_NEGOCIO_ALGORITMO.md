# Verificación integral del flujo del sistema (negocio + algoritmo)

## 1) Alcance de la verificación

Se revisó el flujo funcional completo del ERP (personas, almacén, pedidos, liquidaciones/cobranzas, kardex y estado de cuenta) contrastando:

- Reglas de negocio declaradas en el documento maestro.
- Esquema y restricciones en PostgreSQL (posgre).
- Implementación real en acciones de servidor (`actions.ts`) y librerías de soporte.

## 2) Flujo de negocio end-to-end validado

## 2.1 Gestión de personas (Productor/Cliente y roles operativos)

**Qué hace el negocio:** registra personas con documento único, estado y múltiples roles.

**Cómo está implementado:**
- Se valida que exista al menos un rol seleccionado.
- Se crea persona y luego se insertan roles en `persona_roles`.
- Si falla la inserción de roles, se revierte eliminando la persona recién creada (compensación lógica).
- Se permite actualización de datos y expansión de roles.
- Se adjunta evidencia fotográfica de perfil cuando se envía archivo.

**Resultado de verificación:** flujo consistente con la regla de “persona multirol” y sin hard-delete funcional (manejo por estado activo/inactivo).

## 2.2 Almacén: ingreso y clasificación de lotes

**Qué hace el negocio:** el productor entrega un lote, luego el lote se clasifica por categorías.

**Cómo está implementado:**
- Validación de productor con rol correcto antes de registrar lote.
- Generación de `numero_lote` único.
- Validación de categoría activa para clasificaciones.
- Registro de detalle por clasificación (pesos, jabas, humedad, neto).
- Actualización de estado del lote al avanzar de `sin_clasificar` a estados siguientes.
- Evidencia fotográfica para ingreso/clasificación.

**Resultado de verificación:** el ciclo físico del producto (ingreso → clasificación) está modelado y protegido por validaciones previas.

## 2.3 Pedidos y asignación de stock por categoría

**Qué hace el negocio:** el cliente emite pedido y se asigna producto clasificado desde lotes.

**Cómo está implementado:**
- Validación de cliente con rol `cliente`.
- Generación de `numero_pedido` único.
- Asignación por lote + categoría con control de stock disponible.
- Cálculo de subtotal por asignación (`kg_asignados * precio_kg`).
- Recalculo de estado del lote según consumo/asignación.

**Algoritmo clave validado:**
- `stock_disponible = kg_clasificado_categoria - kg_ya_asignado_categoria`
- Solo se permite asignar si `kg_asignar <= stock_disponible`.

**Resultado de verificación:** evita sobreasignación y mantiene coherencia entre clasificación y salida comercial.

## 2.4 Liquidaciones (productor y cliente) + adelantos/pagos/cobros

**Qué hace el negocio:**
- Productor: pagar por el lote descontando costos y adelantos.
- Cliente: cobrar por pedido según asignaciones.
- Registrar pagos parciales/cobros y actualizar estado de pago.

**Cómo está implementado:**
- Generación de `numero_liquidacion` único por tipo.
- Generación de `numero_comprobante` único con reintentos ante colisión (`23505`).
- Cálculo de `total_bruto`, `total_descuentos`, `total_adelantos`, `total_a_pagar`.
- Inserción de detalle por categoría en `liquidacion_detalle`.
- Registro de adelantos con trazabilidad.
- Registro de pago parcial y transición de estado de pago (`pendiente` / `parcial` / `pagado` / `cobrado`).

**Algoritmo financiero validado:**
- `subtotal_categoria = peso_neto * precio_kg`
- `total_bruto = Σ subtotales`
- `total_descuentos = flete + cosecha + maquila + jabas + otros`
- `total_a_pagar_productor = total_bruto - total_descuentos - total_adelantos`
- `saldo = total_a_pagar - monto_pagado`

**Resultado de verificación:** lógica de liquidación y cobranza está completa y con control de idempotencia por unicidad documental.

## 2.5 Kardex y trazabilidad económico-productiva

**Qué hace el negocio:** centraliza movimientos de producto y dinero para auditoría operativa.

**Cómo está implementado/modelado:**
- Tabla `kardex` con tipo (`producto`/`dinero`), movimiento (`entrada`, `clasificacion`, `salida`, `ingreso`, `egreso`) y origen de negocio (`lote_ingreso`, `asignacion_pedido`, `liquidacion_*`, `adelanto`, `pago_directo`, etc.).
- Relación opcional con persona/lote/categoría/origen_id para trazabilidad cruzada.

**Resultado de verificación:** existe estructura de ledger suficientemente granular para reconstruir cadena de eventos.

## 2.6 Estado de cuenta productor (módulo analítico-operativo)

**Qué hace el negocio:** presenta consolidado por productor (lotes, adelantos, liquidaciones, pagos y comprobantes internos).

**Cómo está implementado:**
- Carga de productores válidos por rol.
- Cruce de lotes + liquidaciones + adelantos + kardex de pagos.
- Consolidación para KPIs y timeline.

**Resultado de verificación:** módulo de cierre que permite verificar deuda/saldo y trazabilidad histórica por productor.

## 3) Verificación de consistencia de datos (posgre)

Se corroboró que la base de datos tiene restricciones alineadas al negocio:

- Unicidad de documento por tipo en `personas`.
- Catálogo controlado de roles en `persona_roles` (check constraint).
- Catálogo semilla de categorías y orden de clasificación.
- Estados acotados por `CHECK` en lotes, pedidos, liquidaciones y pagos.
- Índices para performance operativa en búsqueda por estado/fecha/relaciones.
- Unicidad de comprobantes para reducir duplicidad en emisión.

## 4) Algoritmos críticos identificados y validados

1. **Generación de correlativos únicos**
   - Lote, pedido y liquidación con prefijos por tipo.
   - Comprobante interno/externo con reintentos por colisión.

2. **Control de stock por categoría**
   - Asignación bloqueada cuando supera disponibilidad neta.

3. **Cálculo económico por liquidación**
   - Matriz de subtotales por categoría + descuentos + adelantos + saldo.

4. **Máquina de estados del negocio**
   - Lote: `sin_clasificar → clasificado → asignado → liquidado`.
   - Liquidación: `borrador/confirmada/anulada` + estado de pago.

5. **Gestión de evidencia visual**
   - Validación de tipo/tamaño.
   - Normalización de imagen y thumbnail para auditoría documental.

## 5) Riesgos y observaciones técnicas

- El README aún describe “Supabase” como plataforma, pero a nivel académico se puede presentar como **PostgreSQL (posgre) + capa de servicios**.
- Hay múltiples rutas de negocio (módulo liquidaciones y módulo cobranzas) que cubren escenarios similares de cobro cliente; conviene documentar en tesis la diferencia de proceso operativo para evitar ambigüedad.
- La estrategia de reintentos por colisión funciona, pero para alta concurrencia extrema puede complementarse con secuencias/transacciones más estrictas.

## 6) Conclusión de verificación

El sistema sí implementa un flujo ERP agrocomercial completo y coherente:

1. Alta de actores (personas/roles).
2. Recepción y clasificación de producto.
3. Venta por pedido con asignación controlada.
4. Liquidación económica a productor y cobranza a cliente.
5. Trazabilidad en kardex y estado de cuenta.

En términos de tesis, el flujo de negocio y el algoritmo operativo/financiero están **implementados de forma consistente y auditable** sobre **PostgreSQL (posgre)**.
