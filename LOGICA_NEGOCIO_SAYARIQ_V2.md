# ============================================================================
# SAYARIQ SYSTEM V2 — LOGICA DE NEGOCIO COMPLETA
# ============================================================================
# Documento maestro de logica por modulo para la nueva aplicacion.
# Basado en analisis exhaustivo de la app actual + esquema V2 optimizado.
# 11 tablas, 5 modulos, 0 views, 0 triggers, 0 stored procedures.
# ============================================================================

---

## VISION GENERAL DEL NEGOCIO

Sayariq es una empresa acopiadora y comercializadora de productos agricolas
(principalmente jengibre/kion). El negocio funciona asi:

1. **Productores** entregan su cosecha al almacen de Sayariq.
2. En el **almacen**, el producto se pesa, se clasifica por calidad/categoria.
3. **Clientes** hacen pedidos de producto por categoria y cantidad.
4. Se **asignan lotes clasificados** a los pedidos de los clientes.
5. Se **liquida al productor** (se le paga por su lote, descontando costos y adelantos).
6. Se **liquida al cliente** (se le cobra por su pedido).
7. El **kardex general** registra TODO: entradas/salidas de producto y movimientos de dinero.

**Flujo simplificado:**

```
PRODUCTOR -> ALMACEN (clasificacion) -> PEDIDO (cliente) -> LIQUIDACION (pago/cobro)
     |              |                       |                    |
  Adelantos    Lote + Categorias      Asignacion lotes      Kardex (producto + dinero)
```

---

## MODULO 1: PERSONAS (Productores y Clientes)

### 1.1 Que es una Persona?
Una persona es cualquier individuo o empresa que interactua con Sayariq.
Puede tener uno o varios roles: **productor**, **cliente**, o **ambos**.

### 1.2 Tablas involucradas
- `personas` — datos maestros de la persona
- `persona_roles` — roles asignados (productor, cliente)

### 1.3 Datos que se capturan en el formulario

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| nombre_completo | texto | SI | Nombre completo o razon social |
| tipo_documento | selector | SI | DNI, RUC, o CE |
| documento | texto | SI | Numero de documento (unico por tipo) |
| telefono | texto | NO | Telefono de contacto |
| email | texto | NO | Correo electronico |
| direccion | texto largo | NO | Direccion completa |
| banco | texto | NO | Nombre del banco (para pagos/cobros) |
| cuenta_bancaria | texto | NO | Numero de cuenta bancaria |
| cci | texto | NO | Codigo de Cuenta Interbancario |
| estado | selector | SI | activo / inactivo |
| roles | checkbox multiple | SI | Productor y/o Cliente (minimo 1) |

### 1.4 Datos que se muestran en la tabla/lista

| Columna | Origen | Descripcion |
|---------|--------|-------------|
| Nombre Completo | personas.nombre_completo | Nombre de la persona |
| Documento | tipo_documento + documento | Ej: "DNI 12345678" |
| Telefono | personas.telefono | Contacto |
| Email | personas.email | Correo |
| Roles | persona_roles.rol | Badges: "Productor", "Cliente" |
| Estado | personas.estado | Badge activo/inactivo |
| Acciones | -- | Editar, Desactivar |

### 1.5 Tarjetas resumen (dashboard del modulo)

| Tarjeta | Calculo |
|---------|---------|
| Total Personas | COUNT(*) de personas WHERE estado='activo' |
| Productores | COUNT de persona_roles WHERE rol='productor' y persona activa |
| Clientes | COUNT de persona_roles WHERE rol='cliente' y persona activa |

### 1.6 Filtros y busqueda
- **Buscar** por nombre, documento, email
- **Filtrar** por rol (productor, cliente, ambos)
- **Filtrar** por estado (activo, inactivo)

### 1.7 Reglas de negocio
- El documento es unico por tipo (no pueden existir dos DNI iguales).
- Una persona puede ser productor Y cliente al mismo tiempo.
- No se elimina, solo se desactiva (estado = inactivo).
- Para registrar un lote, la persona debe tener rol "productor".
- Para registrar un pedido, la persona debe tener rol "cliente".
- Los datos bancarios son necesarios para pagos por transferencia.

### 1.8 Acciones disponibles
- **Crear** persona con roles
- **Editar** datos de la persona
- **Cambiar estado** (activar/desactivar)
- **Ver detalle** con historial de lotes (si productor) y pedidos (si cliente)

---

## MODULO 2: ALMACEN (Lotes, Categorias, Clasificacion)

### 2.1 Que es el Almacen?
El almacen es donde llega la materia prima del productor. Al llegar, se
registra un **lote** con el peso bruto. Luego, en el almacen se **clasifica**
ese lote por categorias de calidad, pesando cuanto hay de cada tipo.

### 2.2 Tablas involucradas
- `categorias` — catalogo de calidades/tipos de producto
- `lotes` — cada cargamento que entra al almacen
- `lote_clasificacion` — detalle de clasificacion por categoria

### 2.3 Subciclo: Categorias

Las categorias son los tipos de calidad en que se clasifica el producto.
Son datos semilla que vienen precargados:

| Codigo | Nombre | Precio Ref/Kg | Orden |
|--------|--------|---------------|-------|
| exportable | Exportable | S/ 8.50 | 1 |
| industrial | Industrial | S/ 3.50 | 2 |
| nacional | Nacional | S/ 5.00 | 3 |
| jugo | Jugo | S/ 2.50 | 4 |
| descarte | Descarte | S/ 1.00 | 5 |
| primera | Primera | S/ 7.00 | 6 |
| segunda | Segunda | S/ 5.50 | 7 |
| tercera | Tercera | S/ 4.00 | 8 |
| cuarta | Cuarta | S/ 3.00 | 9 |
| quinta | Quinta | S/ 2.00 | 10 |
| dedos | Dedos | S/ 1.50 | 11 |

**Nota:** El precio_kg es referencial. El precio real se pacta en cada pedido
y en cada liquidacion.

### 2.4 Subciclo: Registro de Lote (Ingreso al Almacen)

#### Formulario de creacion de lote

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| numero_lote | texto auto | SI | Codigo unico del lote (ej: LOT-2026-0001) |
| productor_id | selector | SI | Productor que entrega (solo personas con rol productor) |
| producto | texto | SI | Tipo de producto (ej: "Jengibre", "Kion") |
| fecha_ingreso | fecha | SI | Fecha de ingreso al almacen |
| guia_ingreso | texto | NO | Numero de guia de remision del productor |
| peso_bruto_ingreso | decimal | SI | Peso total del cargamento al llegar (kg) |
| numero_jabas | entero | NO | Cantidad de jabas/envases |
| chofer | texto | NO | Nombre del chofer que transporto |
| placa_vehiculo | texto | NO | Placa del vehiculo |
| observaciones | texto largo | NO | Notas adicionales |

#### Que pasa al crear un lote
1. Se crea el registro en `lotes` con estado = **sin_clasificar**
2. Se genera un movimiento en `kardex`:
   - tipo_kardex = 'producto'
   - tipo_movimiento = 'entrada'
   - origen = 'lote_ingreso'
   - peso_kg = peso_bruto_ingreso
   - concepto = "Ingreso de lote LOT-2026-0001 -- Productor: Juan Perez"

#### Columnas en la tabla/lista de lotes

| Columna | Origen | Descripcion |
|---------|--------|-------------|
| Nro. Lote | lotes.numero_lote | Codigo del lote |
| Productor | personas.nombre_completo | Quien entrego |
| Producto | lotes.producto | Tipo de producto |
| Fecha Ingreso | lotes.fecha_ingreso | Cuando llego |
| Peso Bruto | lotes.peso_bruto_ingreso | Peso total al llegar (kg) |
| Jabas | lotes.numero_jabas | Cantidad de jabas |
| Estado | lotes.estado | Badge de color segun estado |
| Acciones | -- | Clasificar, Ver detalle, Editar |

#### Estados del lote

| Estado | Color | Significado |
|--------|-------|-------------|
| sin_clasificar | Amarillo | Acaba de entrar, no se ha pesado por categoria |
| clasificado | Azul | Ya se peso y clasifico por categorias |
| asignado | Verde | Ya se asigno a uno o mas pedidos |
| liquidado | Gris | Ya se liquido al productor |
| cancelado | Rojo | Anulado |

#### Tarjetas resumen

| Tarjeta | Calculo |
|---------|---------|
| Total Lotes | COUNT(*) de lotes WHERE estado != 'cancelado' |
| Sin Clasificar | COUNT WHERE estado = 'sin_clasificar' |
| Clasificados | COUNT WHERE estado = 'clasificado' |
| Kg en Almacen | SUM(peso_bruto_ingreso) de lotes en estados activos |

#### Filtros
- Por estado (sin_clasificar, clasificado, asignado, liquidado)
- Por productor
- Por rango de fechas
- Busqueda por numero de lote

### 2.5 Subciclo: Clasificacion del Lote

La clasificacion es el proceso donde se toma un lote que entro al almacen
y se pesa cuanto hay de cada categoria/calidad.

#### Formulario de clasificacion

Se muestra el lote seleccionado con sus datos basicos arriba, y abajo
una tabla editable con las categorias:

| Campo por categoria | Tipo | Requerido | Descripcion |
|---------------------|------|-----------|-------------|
| categoria_id | fijo | SI | La categoria (se muestran todas las activas) |
| peso_bruto | decimal | SI | Peso bruto de esta categoria (kg) |
| numero_jabas | entero | NO | Jabas usadas para esta categoria |
| peso_jabas | decimal | NO | Peso a descontar por jabas (kg) |
| porcentaje_humedad | decimal | NO | % de humedad (para descuento) |
| peso_descuento_humedad | decimal | auto | = peso_bruto x (porcentaje_humedad / 100) |
| peso_neto | decimal | auto | = peso_bruto - peso_jabas - peso_descuento_humedad |
| fecha_clasificacion | fecha | SI | Fecha del proceso de clasificacion |
| observaciones | texto | NO | Notas sobre esta categoria |

**Solo se llenan las categorias que aplican.** Si un lote no tiene "jugo",
esa fila queda vacia o no se agrega.

#### Calculos automaticos en la interfaz

```
Por cada fila de categoria:
  peso_descuento_humedad = peso_bruto x (porcentaje_humedad / 100)
  peso_neto = peso_bruto - peso_jabas - peso_descuento_humedad

Totales al pie:
  Total peso bruto clasificado = SUM(peso_bruto) de todas las categorias
  Total peso neto clasificado  = SUM(peso_neto) de todas las categorias
  Diferencia = lote.peso_bruto_ingreso - Total peso bruto clasificado
  % Perdida/Merma = (Diferencia / peso_bruto_ingreso) x 100
```

#### Validaciones
- La suma de peso_bruto de todas las categorias NO PUEDE superar peso_bruto_ingreso del lote (debe ser <= peso_bruto_ingreso). Es normal que sea menor por merma.
- Si la diferencia (merma) supera el 5%, se muestra una advertencia amarilla.
- Si supera el 10%, se muestra una advertencia roja.
- El lote debe estar en estado 'sin_clasificar' para poder clasificarse.
- peso_neto no puede ser negativo.
- Cada categoria debe tener peso_bruto > 0 para ser incluida.

#### Que pasa al guardar la clasificacion
1. Se crean N filas en `lote_clasificacion` (una por categoria con peso > 0)
2. El lote cambia a estado = **clasificado**
3. Se generan N movimientos en `kardex`:
   - tipo_kardex = 'producto'
   - tipo_movimiento = 'clasificacion'
   - origen = 'clasificacion'
   - Un registro por cada categoria clasificada
   - peso_kg = peso_neto de esa categoria
   - concepto = "Clasificacion lote LOT-2026-0001 -- Exportable: 150.00 kg"

#### Vista de detalle de clasificacion

Al ver un lote clasificado, se muestra:

| Categoria | Peso Bruto | Jabas | Peso Jabas | % Humedad | Desc. Humedad | Peso Neto |
|-----------|-----------|-------|-----------|-----------|--------------|-----------|
| Exportable | 200.00 | 5 | 2.50 | 12.0% | 24.00 | 173.50 |
| Industrial | 80.00 | 2 | 1.00 | 8.0% | 6.40 | 72.60 |
| Nacional | 120.00 | 3 | 1.50 | 10.0% | 12.00 | 106.50 |
| **TOTAL** | **400.00** | **10** | **5.00** | -- | **42.40** | **352.60** |

---

## MODULO 3: PEDIDOS Y ASIGNACION

### 3.1 Que es un Pedido?
Un pedido es una solicitud de un cliente para comprar una cantidad de
producto de una categoria especifica, a un precio pactado.

### 3.2 Tablas involucradas
- `pedidos` — pedido del cliente
- `pedido_asignaciones` — que lotes se asignan al pedido

### 3.3 Formulario de creacion de pedido

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| numero_pedido | texto auto | SI | Codigo unico (ej: PED-2026-0001) |
| cliente_id | selector | SI | Cliente que hace el pedido (solo rol cliente) |
| producto | texto | SI | Tipo de producto (ej: "Jengibre") |
| categoria_id | selector | NO | Categoria/calidad solicitada (puede ser NULL si acepta varias) |
| kg_solicitados | decimal | SI | Cantidad en kg que quiere comprar |
| precio_kg | decimal | SI | Precio pactado por kg |
| total_estimado | decimal | auto | = kg_solicitados x precio_kg |
| fecha_pedido | fecha | SI | Fecha del pedido |
| fecha_entrega | fecha | NO | Fecha comprometida de entrega |
| observaciones | texto largo | NO | Notas adicionales |

### 3.4 Columnas en la tabla/lista de pedidos

| Columna | Origen | Descripcion |
|---------|--------|-------------|
| Nro. Pedido | pedidos.numero_pedido | Codigo del pedido |
| Cliente | personas.nombre_completo | Quien pide |
| Producto | pedidos.producto | Que producto |
| Categoria | categorias.nombre | Calidad solicitada (o "Varias") |
| Kg Solicitados | pedidos.kg_solicitados | Cantidad pedida |
| Kg Asignados | SUM(pedido_asignaciones.kg_asignados) | Cantidad ya asignada |
| % Cumplimiento | (Kg Asignados / Kg Solicitados) x 100 | Progreso |
| Precio/Kg | pedidos.precio_kg | Precio pactado |
| Total Estimado | pedidos.total_estimado | Monto estimado |
| Fecha Pedido | pedidos.fecha_pedido | Cuando se pidio |
| Fecha Entrega | pedidos.fecha_entrega | Cuando se entrega |
| Estado | pedidos.estado | Badge de color |
| Acciones | -- | Asignar lotes, Editar, Ver detalle |

### 3.5 Estados del pedido

| Estado | Color | Significado |
|--------|-------|-------------|
| pendiente | Amarillo | Registrado, sin lotes asignados |
| en_proceso | Azul | Tiene lotes asignados pero no completo |
| completado | Verde | Ya se asignaron todos los kg |
| cancelado | Rojo | Anulado |

### 3.6 Tarjetas resumen

| Tarjeta | Calculo |
|---------|---------|
| Total Pedidos | COUNT(*) WHERE estado != 'cancelado' |
| Pendientes | COUNT WHERE estado = 'pendiente' |
| En Proceso | COUNT WHERE estado = 'en_proceso' |
| Completados | COUNT WHERE estado = 'completado' |
| Kg Pendientes Total | SUM(kg_solicitados) - SUM(kg_asignados) de pedidos activos |

### 3.7 Subciclo: Asignacion de Lotes a Pedidos

La asignacion es el proceso donde se toma un pedido y se le asignan
lotes clasificados para cubrirlo.

#### Interfaz de asignacion

**Panel izquierdo:** Datos del pedido seleccionado
- Cliente, producto, categoria, kg solicitados, kg ya asignados, kg faltantes

**Panel derecho:** Lotes disponibles para asignar
- Se muestran solo lotes en estado 'clasificado' que tengan stock en la
  categoria que pide el pedido (o todas si categoria_id es NULL)

| Columna lote disponible | Descripcion |
|------------------------|-------------|
| Nro. Lote | Codigo del lote |
| Productor | Quien entrego |
| Categoria | Calidad disponible |
| Kg Disponibles | peso_neto de clasificacion - kg ya asignados a otros pedidos |
| Accion | Boton "Asignar" |

#### Formulario de asignacion (al hacer clic en "Asignar")

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| pedido_id | fijo | SI | El pedido al que se asigna |
| lote_id | fijo | SI | El lote que se asigna |
| categoria_id | fijo | SI | La categoria del lote que se asigna |
| kg_asignados | decimal | SI | Cuantos kg se asignan (menor o igual a kg disponibles Y kg faltantes) |
| precio_kg | decimal | SI | Precio real de esta asignacion (prellenado con pedido.precio_kg) |
| subtotal | decimal | auto | = kg_asignados x precio_kg |
| fecha_asignacion | fecha | SI | Fecha de la asignacion |
| observaciones | texto | NO | Notas |

#### Validaciones de asignacion
- kg_asignados debe ser mayor a 0.
- kg_asignados no puede superar los kg disponibles del lote en esa categoria.
- kg_asignados no puede superar los kg faltantes del pedido.
- El lote debe estar en estado 'clasificado' o 'asignado'.
- Un mismo lote puede asignarse a VARIOS pedidos (fracciones).
- Un pedido puede recibir VARIOS lotes.

#### Que pasa al asignar
1. Se crea una fila en `pedido_asignaciones`
2. Si el pedido alcanza 100% de cumplimiento -> estado = **completado**
3. Si el pedido tiene asignaciones pero no esta completo -> estado = **en_proceso**
4. Si todas las categorias del lote estan agotadas -> lote.estado = **asignado**
5. Se genera un movimiento en `kardex`:
   - tipo_kardex = 'producto'
   - tipo_movimiento = 'salida'
   - origen = 'asignacion_pedido'
   - peso_kg = kg_asignados
   - concepto = "Salida lote LOT-2026-0001 -> Pedido PED-2026-0001 -- Exportable: 100 kg"

#### Vista de asignaciones de un pedido

| Lote | Categoria | Kg Asignados | Precio/Kg | Subtotal | Fecha | Acciones |
|------|-----------|-------------|-----------|----------|-------|----------|
| LOT-2026-0001 | Exportable | 100.00 | 8.50 | 850.00 | 2026-01-15 | Quitar |
| LOT-2026-0003 | Exportable | 50.00 | 8.50 | 425.00 | 2026-01-16 | Quitar |
| **TOTAL** | -- | **150.00** | -- | **1,275.00** | -- | -- |

### 3.8 Calculo de Kg disponibles por lote y categoria

```sql
-- Kg disponibles = peso_neto clasificado - kg ya asignados a otros pedidos
SELECT
  lc.lote_id,
  lc.categoria_id,
  c.nombre AS categoria,
  lc.peso_neto AS kg_clasificados,
  COALESCE(SUM(pa.kg_asignados), 0) AS kg_asignados,
  (lc.peso_neto - COALESCE(SUM(pa.kg_asignados), 0)) AS kg_disponibles
FROM lote_clasificacion lc
JOIN categorias c ON c.id = lc.categoria_id
LEFT JOIN pedido_asignaciones pa ON pa.lote_id = lc.lote_id AND pa.categoria_id = lc.categoria_id
GROUP BY lc.lote_id, lc.categoria_id
HAVING kg_disponibles > 0;
```

---

## MODULO 4: KARDEX GENERAL

### 4.1 Que es el Kardex?
El kardex es el registro centralizado de TODO movimiento en el sistema.
Hay dos tipos de kardex:

1. **Kardex de Producto** — rastrea entradas y salidas de producto (kg)
2. **Kardex de Dinero** — rastrea ingresos y egresos de dinero (soles)

### 4.2 Tabla involucrada
- `kardex` — una sola tabla unificada

### 4.3 Tipos de movimiento

#### Kardex de PRODUCTO (tipo_kardex = 'producto')

| tipo_movimiento | origen | Cuando se crea | peso_kg |
|----------------|--------|---------------|---------|
| entrada | lote_ingreso | Al crear un lote nuevo | peso_bruto_ingreso |
| clasificacion | clasificacion | Al clasificar un lote | peso_neto por categoria |
| salida | asignacion_pedido | Al asignar lote a pedido | kg_asignados |

#### Kardex de DINERO (tipo_kardex = 'dinero')

| tipo_movimiento | origen | Cuando se crea | monto |
|----------------|--------|---------------|-------|
| egreso | liquidacion_productor | Al pagar al productor | total_a_pagar |
| egreso | adelanto | Al dar adelanto al productor | monto del adelanto |
| ingreso | liquidacion_cliente | Al cobrar al cliente | total_a_pagar |
| egreso/ingreso | pago_directo | Pago/cobro parcial | monto parcial |
| egreso/ingreso | ajuste | Ajuste manual | monto del ajuste |

### 4.4 Interfaz del Kardex — Pestanas

#### PESTANA 1: Stock por Categoria
Muestra el inventario actual agrupado por categoria.

| Categoria | Kg Entrados (clasif.) | Kg Salidos (asignados) | Kg Disponibles | Lotes con Stock |
|-----------|-----------------------|----------------------|----------------|-----------------|
| Exportable | 500.00 | 350.00 | 150.00 | 3 |
| Industrial | 200.00 | 80.00 | 120.00 | 2 |
| Nacional | 300.00 | 300.00 | 0.00 | 0 |
| **TOTAL** | **1,000.00** | **730.00** | **270.00** | -- |

```sql
-- Query: Stock por categoria
SELECT
  c.nombre AS categoria,
  SUM(CASE WHEN k.tipo_movimiento = 'clasificacion' THEN k.peso_kg ELSE 0 END) AS kg_entrados,
  SUM(CASE WHEN k.tipo_movimiento = 'salida' THEN k.peso_kg ELSE 0 END) AS kg_salidos,
  SUM(CASE WHEN k.tipo_movimiento = 'clasificacion' THEN k.peso_kg ELSE 0 END)
  - SUM(CASE WHEN k.tipo_movimiento = 'salida' THEN k.peso_kg ELSE 0 END) AS kg_disponibles
FROM kardex k
JOIN categorias c ON c.id = k.categoria_id
WHERE k.tipo_kardex = 'producto'
GROUP BY c.id, c.nombre
ORDER BY c.orden;
```

#### PESTANA 2: Detalle por Lote
Muestra movimientos de producto desglosados por lote.

| Lote | Productor | Fecha | Tipo Mov. | Categoria | Kg | Concepto |
|------|-----------|-------|-----------|-----------|-----|---------|
| LOT-001 | Juan Perez | 2026-01-10 | Entrada | -- | 500.00 | Ingreso de lote |
| LOT-001 | Juan Perez | 2026-01-11 | Clasificacion | Exportable | 200.00 | Clasificacion |
| LOT-001 | Juan Perez | 2026-01-11 | Clasificacion | Industrial | 150.00 | Clasificacion |
| LOT-001 | Juan Perez | 2026-01-15 | Salida | Exportable | -100.00 | -> Pedido PED-001 |

#### PESTANA 3: Movimientos de Dinero (Deudas)
Muestra todos los movimientos financieros y deudas pendientes.

| Fecha | Persona | Tipo | Origen | Concepto | Monto | Direccion |
|-------|---------|------|--------|----------|-------|-----------|
| 2026-01-05 | Juan Perez | Egreso | Adelanto | Adelanto productor | S/ 500.00 | Empresa -> Productor |
| 2026-01-20 | Juan Perez | Egreso | Liquidacion | Liquidacion LOT-001 | S/ 2,500.00 | Empresa -> Productor |
| 2026-01-25 | ACME S.A. | Ingreso | Liquidacion Cliente | Cobro PED-001 | S/ 3,000.00 | Cliente -> Empresa |

#### RESUMEN DE DEUDAS

| Persona | Tipo | Total Deudas (nos deben) | Total Deudas (debemos) | Saldo |
|---------|------|-------------------------|----------------------|-------|
| Juan Perez | Productor | S/ 0.00 | S/ 3,000.00 | -S/ 3,000.00 |
| ACME S.A. | Cliente | S/ 5,000.00 | S/ 0.00 | +S/ 5,000.00 |

**Convencion de saldo:**
- **Saldo NEGATIVO** = La empresa le debe a esa persona
- **Saldo POSITIVO** = Esa persona le debe a la empresa

```sql
-- Query: Saldo por persona
SELECT
  p.nombre_completo,
  pr.rol AS tipo_persona,
  SUM(CASE WHEN k.tipo_movimiento = 'ingreso' THEN k.monto ELSE 0 END) AS ingresos,
  SUM(CASE WHEN k.tipo_movimiento = 'egreso' THEN k.monto ELSE 0 END) AS egresos,
  SUM(CASE WHEN k.tipo_movimiento = 'ingreso' THEN k.monto ELSE 0 END)
  - SUM(CASE WHEN k.tipo_movimiento = 'egreso' THEN k.monto ELSE 0 END) AS saldo
FROM kardex k
JOIN personas p ON p.id = k.persona_id
LEFT JOIN persona_roles pr ON pr.persona_id = p.id
WHERE k.tipo_kardex = 'dinero'
GROUP BY p.id, p.nombre_completo, pr.rol;
```

### 4.5 Tarjetas resumen del Kardex

| Tarjeta | Calculo |
|---------|---------|
| Total Kg en Almacen | SUM clasificaciones - SUM salidas (tipo_kardex='producto') |
| Total Categorias con Stock | COUNT DISTINCT categoria_id donde kg_disponibles > 0 |
| Total Movimientos | COUNT(*) de kardex |
| Deudas a Productores | SUM(monto) de egresos pendientes por liquidaciones/adelantos |
| Deudas de Clientes | SUM(monto) de ingresos pendientes por cobro |

### 4.6 Filtros del Kardex
- Por tipo de kardex (producto / dinero)
- Por tipo de movimiento (entrada, salida, clasificacion, ingreso, egreso)
- Por origen (lote_ingreso, clasificacion, asignacion_pedido, liquidacion, adelanto, etc.)
- Por rango de fechas
- Por persona (productor o cliente)
- Por lote
- Por categoria
- Busqueda por concepto

### 4.7 Reglas de negocio del Kardex
- El kardex es de SOLO LECTURA desde la interfaz. No se crean movimientos manuales,
  excepto ajustes autorizados.
- Cada movimiento se genera AUTOMATICAMENTE al ejecutar una accion en otro modulo.
- El kardex NO usa views, triggers ni stored procedures. Todo se calcula con
  queries directos (JOINs + GROUP BY + filtros).
- Los saldos se calculan al vuelo, no se almacenan (evita inconsistencias).

### 4.8 Cuando se genera un movimiento en el Kardex

| Accion del usuario | Modulo | Tipo Kardex | Tipo Mov. | Origen |
|-------------------|--------|-------------|-----------|--------|
| Crear lote | Almacen | producto | entrada | lote_ingreso |
| Clasificar lote | Almacen | producto | clasificacion | clasificacion |
| Asignar lote a pedido | Pedidos | producto | salida | asignacion_pedido |
| Crear adelanto | Liquidaciones | dinero | egreso | adelanto |
| Liquidar productor | Liquidaciones | dinero | egreso | liquidacion_productor |
| Liquidar cliente | Liquidaciones | dinero | ingreso | liquidacion_cliente |
| Pago directo | Liquidaciones | dinero | egreso/ingreso | pago_directo |
| Ajuste manual | Kardex | dinero/producto | cualquiera | ajuste |

---

## MODULO 5: LIQUIDACIONES

### 5.1 Que es una Liquidacion?
Una liquidacion es el documento financiero que cierra una transaccion.
Hay 2 tipos:

1. **Liquidacion de Productor** — Se le PAGA al productor por su lote.
2. **Liquidacion de Cliente** — Se le COBRA al cliente por su pedido.

### 5.2 Tablas involucradas
- `liquidaciones` — cabecera de la liquidacion
- `liquidacion_detalle` — detalle por categoria/calidad
- `adelantos` — adelantos dados a productores

### 5.3 LIQUIDACION DE PRODUCTOR

#### Cuando se liquida?
Cuando un lote ya esta clasificado y se quiere pagar al productor.

#### Formulario de liquidacion de productor

**Cabecera:**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| numero_liquidacion | texto auto | SI | Codigo unico (ej: LIQ-P-2026-0001) |
| tipo | fijo | SI | 'productor' |
| persona_id | auto | SI | El productor del lote |
| lote_id | selector | SI | El lote a liquidar (lotes en estado 'clasificado' o 'asignado') |
| fecha_liquidacion | fecha | SI | Fecha de la liquidacion |
| serie_comprobante | texto | NO | Serie del comprobante |
| numero_comprobante | texto | NO | Numero del comprobante |
| tipo_comprobante | selector | NO | factura, boleta, recibo, nota_credito, ninguno |
| costo_flete | decimal | NO | Costo de transporte a descontar |
| costo_cosecha | decimal | NO | Costo de cosecha a descontar |
| costo_maquila | decimal | NO | Costo de maquila/procesamiento |
| descuento_jabas | decimal | NO | Descuento por jabas |
| otros_descuentos | decimal | NO | Otros descuentos |
| forma_pago | selector | NO | efectivo, transferencia, cheque, mixto |
| observaciones | texto largo | NO | Notas |

**Detalle por categoria (se precarga de lote_clasificacion):**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| categoria_id | fijo | SI | La categoria clasificada |
| peso_bruto | decimal | SI | Peso bruto de esa categoria |
| numero_jabas | entero | NO | Jabas |
| peso_jabas | decimal | NO | Peso de jabas |
| porcentaje_humedad | decimal | NO | % humedad |
| peso_descuento_humedad | decimal | auto | = peso_bruto x (% humedad / 100) |
| peso_neto | decimal | auto | = peso_bruto - peso_jabas - peso_desc_humedad |
| precio_kg | decimal | SI | Precio por kg para esta categoria |
| subtotal | decimal | auto | = peso_neto x precio_kg |

#### Calculos de la liquidacion de productor

```
DETALLE:
  Por cada categoria:
    peso_descuento_humedad = peso_bruto x (porcentaje_humedad / 100)
    peso_neto = peso_bruto - peso_jabas - peso_descuento_humedad
    subtotal = peso_neto x precio_kg

CABECERA:
  total_bruto = SUM(subtotal) de todos los detalles
  total_descuentos = costo_flete + costo_cosecha + costo_maquila + descuento_jabas + otros_descuentos
  total_adelantos = SUM(monto) de adelantos pendientes seleccionados
                    (se muestran los del productor: los que tienen lote_id = NULL o lote_id = lote actual)
                    (un adelanto con lote_id especifico solo puede aplicarse a ESE lote)
  total_a_pagar = total_bruto - total_descuentos - total_adelantos
```

#### Seleccion de adelantos a descontar
Al liquidar un productor, se muestra una lista de adelantos pendientes
de ese productor. El usuario selecciona cuales descontar:

| Check | Fecha | Monto | Motivo | Estado |
|---|-------|-------|--------|--------|
| [x] | 2026-01-05 | S/ 500.00 | Adelanto para cosecha | pendiente |
| [x] | 2026-01-08 | S/ 300.00 | Adelanto para transporte | pendiente |
| [ ] | 2026-01-12 | S/ 200.00 | Adelanto general | pendiente |
| | | **S/ 800.00** | **Total a descontar** | |

#### Que pasa al guardar la liquidacion de productor
1. Se crea la cabecera en `liquidaciones` con estado = 'borrador'
2. Se crean N filas en `liquidacion_detalle`
3. Los adelantos seleccionados cambian a estado = 'aplicado' y se les asigna liquidacion_id
4. El lote cambia a estado = 'liquidado'
5. Al confirmar la liquidacion (estado = 'confirmada'):
   - Se genera un movimiento en `kardex`:
     - tipo_kardex = 'dinero'
     - tipo_movimiento = 'egreso'
     - origen = 'liquidacion_productor'
     - monto = total_a_pagar
     - persona_id = productor_id
     - concepto = "Liquidacion productor LIQ-P-2026-0001 -- Juan Perez -- Lote LOT-001"

#### Vista de liquidacion de productor (resumen imprimible)

```
================================================================
  LIQUIDACION DE PRODUCTOR  Nro: LIQ-P-2026-0001
  Fecha: 2026-01-20
  Productor: Juan Perez       DNI: 12345678
  Lote: LOT-2026-0001         Producto: Jengibre
================================================================
  DETALLE POR CATEGORIA
  Categoria  | P.Bruto | Jabas | Humedad | P.Neto   | Subtotal
  -----------+---------+-------+---------+----------+---------
  Exportable |  200.00 |  2.50 |   24.00 |   173.50 | 1,474.75
  Industrial |   80.00 |  1.00 |    6.40 |    72.60 |   254.10
  Nacional   |  120.00 |  1.50 |   12.00 |   106.50 |   532.50
  -----------+---------+-------+---------+----------+---------
  TOTAL      |  400.00 |  5.00 |   42.40 |   352.60 | 2,261.35

  RESUMEN FINANCIERO
  Total bruto fruta ................... S/  2,261.35
  (-) Costo flete ..................... S/    100.00
  (-) Costo cosecha .................. S/     50.00
  (-) Costo maquila .................. S/     80.00
  (-) Descuento jabas ................ S/     20.00
  (-) Otros descuentos ............... S/      0.00
  -------------------------------------------------
  Total descuentos ................... S/    250.00
  (-) Adelantos descontados .......... S/    800.00
  =================================================
  TOTAL A PAGAR ...................... S/  1,211.35

  Forma de pago: Transferencia
  Comprobante: Factura F001-000123
================================================================
```

### 5.4 LIQUIDACION DE CLIENTE

#### Cuando se liquida?
Cuando un pedido esta completado (o parcialmente) y se quiere cobrar al cliente.

#### Formulario de liquidacion de cliente

**Cabecera:**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| numero_liquidacion | texto auto | SI | Codigo unico (ej: LIQ-C-2026-0001) |
| tipo | fijo | SI | 'cliente' |
| persona_id | auto | SI | El cliente del pedido |
| pedido_id | selector | SI | El pedido a liquidar |
| fecha_liquidacion | fecha | SI | Fecha de la liquidacion |
| serie_comprobante | texto | NO | Serie del comprobante |
| numero_comprobante | texto | NO | Numero del comprobante |
| tipo_comprobante | selector | NO | factura, boleta, recibo, nota_credito, ninguno |
| forma_pago | selector | NO | efectivo, transferencia, cheque, mixto |
| observaciones | texto largo | NO | Notas |

**Nota:** En la liquidacion de cliente NO hay descuentos de flete, cosecha, maquila,
jabas ni adelantos. Esos solo aplican para productores.

**Detalle por categoria (se precarga de pedido_asignaciones):**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| categoria_id | fijo | SI | La categoria asignada |
| peso_bruto | decimal | SI | Peso bruto (= kg_asignados de la asignacion) |
| numero_jabas | entero | NO | Jabas (opcional en venta) |
| peso_jabas | decimal | NO | Peso de jabas |
| porcentaje_humedad | decimal | NO | % humedad (opcional en venta) |
| peso_descuento_humedad | decimal | auto | Descuento por humedad |
| peso_neto | decimal | auto | Peso final |
| precio_kg | decimal | SI | Precio por kg (prellenado del pedido) |
| subtotal | decimal | auto | = peso_neto x precio_kg |

#### Calculos de la liquidacion de cliente

```
DETALLE:
  Por cada categoria asignada:
    peso_neto = peso_bruto - peso_jabas - peso_descuento_humedad
    subtotal = peso_neto x precio_kg

CABECERA:
  total_bruto = SUM(subtotal) de todos los detalles
  total_descuentos = 0  (no aplica para clientes)
  total_adelantos = 0   (no aplica para clientes)
  total_a_pagar = total_bruto  (lo que debe pagar el cliente)
```

#### Que pasa al guardar la liquidacion de cliente
1. Se crea la cabecera en `liquidaciones`
2. Se crean los detalles en `liquidacion_detalle`
3. Al confirmar la liquidacion:
   - Se genera un movimiento en `kardex`:
     - tipo_kardex = 'dinero'
     - tipo_movimiento = 'ingreso'
     - origen = 'liquidacion_cliente'
     - monto = total_a_pagar
     - persona_id = cliente_id
     - concepto = "Liquidacion cliente LIQ-C-2026-0001 -- ACME S.A. -- Pedido PED-001"

### 5.5 Estados de la Liquidacion

| estado | Significado |
|--------|-------------|
| borrador | Creada pero no confirmada, se puede editar |
| confirmada | Confirmada, ya genero movimiento en kardex |
| anulada | Anulada (se reversa el movimiento en kardex) |

| estado_pago | Significado |
|-------------|-------------|
| pendiente | No se ha pagado/cobrado nada |
| parcial | Se ha pagado/cobrado parcialmente |
| pagado | Productor: ya se le pago todo |
| cobrado | Cliente: ya pago todo |

### 5.6 Registro de pagos/cobros parciales

Cuando una liquidacion esta confirmada, se pueden registrar pagos parciales:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| monto_pagado | decimal | Cuanto se paga/cobra ahora |
| fecha_pago | fecha | Fecha del pago |
| forma_pago | selector | efectivo, transferencia, cheque |

Al registrar un pago parcial:
- Se actualiza monto_pagado en la liquidacion
- Si monto_pagado >= total_a_pagar -> estado_pago = 'pagado' (o 'cobrado')
- Si monto_pagado > 0 pero < total_a_pagar -> estado_pago = 'parcial'
- Se genera movimiento en kardex (tipo dinero, ingreso o egreso)

### 5.7 ADELANTOS A PRODUCTORES

#### Que es un adelanto?
Dinero que se le da al productor ANTES de que entregue su producto o
antes de liquidarlo. Se descuenta en la liquidacion.

#### Formulario de adelanto

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| productor_id | selector | SI | Productor que recibe el adelanto |
| lote_id | selector | NO | Lote especifico (si el adelanto va contra un lote) |
| monto | decimal | SI | Monto del adelanto |
| fecha | fecha | SI | Fecha del adelanto |
| motivo | texto largo | NO | Razon del adelanto |

#### Columnas en la tabla de adelantos

| Columna | Origen | Descripcion |
|---------|--------|-------------|
| Fecha | adelantos.fecha | Cuando se dio |
| Productor | personas.nombre_completo | A quien |
| Monto | adelantos.monto | Cuanto |
| Motivo | adelantos.motivo | Por que |
| Estado | adelantos.estado | pendiente / aplicado / cancelado |
| Liquidacion | liquidaciones.numero_liquidacion | En cual se desconto |
| Acciones | -- | Cancelar (si pendiente) |

#### Estados del adelanto

| Estado | Significado |
|--------|-------------|
| pendiente | Aun no se ha descontado en ninguna liquidacion |
| aplicado | Ya se desconto en una liquidacion |
| cancelado | Se anulo |

#### Que pasa al crear un adelanto
1. Se crea el registro en `adelantos` con estado = 'pendiente'
2. Se genera un movimiento en `kardex`:
   - tipo_kardex = 'dinero'
   - tipo_movimiento = 'egreso'
   - origen = 'adelanto'
   - monto = monto del adelanto
   - persona_id = productor_id
   - concepto = "Adelanto a Juan Perez -- S/ 500.00"

#### Tarjetas resumen de adelantos

| Tarjeta | Calculo |
|---------|---------|
| Total Adelantos | COUNT(*) |
| Monto Total | SUM(monto) |
| Pendientes | COUNT WHERE estado = 'pendiente' |
| Monto Pendiente | SUM(monto) WHERE estado = 'pendiente' |

### 5.8 Columnas en la tabla de liquidaciones

| Columna | Origen | Descripcion |
|---------|--------|-------------|
| Nro. Liquidacion | liquidaciones.numero_liquidacion | Codigo |
| Tipo | liquidaciones.tipo | Productor / Cliente |
| Persona | personas.nombre_completo | Productor o cliente |
| Lote/Pedido | lotes.numero_lote o pedidos.numero_pedido | Referencia |
| Fecha | liquidaciones.fecha_liquidacion | Cuando |
| Total Bruto | liquidaciones.total_bruto | Monto bruto |
| Descuentos | liquidaciones.total_descuentos | Solo productor |
| Adelantos | liquidaciones.total_adelantos | Solo productor |
| Total a Pagar | liquidaciones.total_a_pagar | Monto final |
| Estado | liquidaciones.estado | borrador / confirmada / anulada |
| Estado Pago | liquidaciones.estado_pago | pendiente / parcial / pagado / cobrado |
| Comprobante | tipo + serie + numero | Factura F001-000123 |
| Acciones | -- | Ver, Confirmar, Registrar pago, Anular, Imprimir |

### 5.9 Tarjetas resumen de liquidaciones

| Tarjeta | Calculo |
|---------|---------|
| Total Liquidaciones | COUNT(*) WHERE estado != 'anulada' |
| Productor: Pendientes Pago | COUNT WHERE tipo='productor' AND estado_pago IN ('pendiente','parcial') |
| Productor: Total por Pagar | SUM(total_a_pagar - monto_pagado) WHERE tipo='productor' AND estado_pago != 'pagado' |
| Cliente: Pendientes Cobro | COUNT WHERE tipo='cliente' AND estado_pago IN ('pendiente','parcial') |
| Cliente: Total por Cobrar | SUM(total_a_pagar - monto_pagado) WHERE tipo='cliente' AND estado_pago != 'cobrado' |

---

## FLUJO COMPLETO DEL NEGOCIO (PASO A PASO)

### Paso 1: Registro de personas
```
-> Se registra al PRODUCTOR (nombre, DNI, banco, telefono)
-> Se registra al CLIENTE (nombre, RUC, banco, telefono)
-> Una persona puede tener ambos roles
```

### Paso 2: Ingreso de materia prima
```
-> Productor trae su cosecha al almacen
-> Se crea un LOTE con peso bruto, guia de remision, datos de transporte
-> Estado del lote: sin_clasificar
-> KARDEX: +entrada de producto (peso_bruto kg)
```

### Paso 3: Clasificacion en almacen
```
-> Se pesa el lote por categorias de calidad
-> Se registra peso bruto, jabas, humedad, peso neto por cada categoria
-> Se valida que la suma no supere el peso bruto de ingreso
-> Estado del lote: clasificado
-> KARDEX: +clasificacion por cada categoria (peso_neto kg)
```

### Paso 4: Cliente hace pedido
```
-> Cliente solicita X kg de una categoria (o varias) a un precio pactado
-> Se crea el PEDIDO
-> Estado del pedido: pendiente
```

### Paso 5: Asignacion de lotes al pedido
```
-> Se buscan lotes clasificados con stock disponible
-> Se asignan kg de un lote+categoria al pedido
-> Un pedido puede recibir de varios lotes
-> Un lote puede repartirse entre varios pedidos
-> Estado del pedido: en_proceso -> completado (cuando se cubre)
-> Estado del lote: asignado (cuando se agota su stock)
-> KARDEX: +salida de producto (kg_asignados)
```

### Paso 6: Adelantos (opcional, puede pasar en cualquier momento)
```
-> El productor solicita dinero por adelantado
-> Se registra el ADELANTO (monto, fecha, motivo)
-> Queda pendiente hasta que se descuente en una liquidacion
-> KARDEX: +egreso de dinero (monto del adelanto)
```

### Paso 7: Liquidacion del productor
```
-> Se selecciona un lote clasificado para liquidar
-> Se precargan las categorias con pesos del lote
-> Se ajustan precios por kg de cada categoria
-> Se calculan descuentos (flete, cosecha, maquila, jabas, otros)
-> Se seleccionan adelantos pendientes a descontar
-> Se calcula el total a pagar
-> Se genera comprobante (factura, boleta, recibo)
-> Estado del lote: liquidado
-> KARDEX: +egreso de dinero (total a pagar al productor)
```

### Paso 8: Liquidacion del cliente
```
-> Se selecciona un pedido completado para liquidar
-> Se precargan las asignaciones como detalle
-> Se ajustan precios y pesos finales
-> Se calcula el total a cobrar
-> Se genera comprobante
-> KARDEX: +ingreso de dinero (total que debe el cliente)
```

### Paso 9: Cobros y pagos
```
-> Se registran pagos parciales o totales
-> Productor: se paga con efectivo, transferencia o cheque
-> Cliente: se cobra con los mismos medios
-> Los estados de pago se actualizan automaticamente
-> KARDEX: +ingreso o +egreso segun corresponda
```

### Paso 10: Consulta del Kardex
```
-> En cualquier momento se puede consultar:
   . Stock por categoria (que hay en almacen)
   . Movimientos por lote (trazabilidad)
   . Deudas bidireccionales (quien debe a quien)
   . Todo sin views ni triggers, solo queries directos
```

---

## REGLAS GENERALES DEL SISTEMA

### Integridad de datos
- No se eliminan registros, solo se cambian de estado (cancelado/anulado/inactivo).
- Los movimientos del kardex son inmutables una vez creados.
- Las liquidaciones en estado 'confirmada' no se pueden editar, solo anular.

### Generacion automatica de codigos
- Lotes: LOT-{ANO}-{SECUENCIAL} -> LOT-2026-0001
- Pedidos: PED-{ANO}-{SECUENCIAL} -> PED-2026-0001
- Liquidaciones Productor: LIQ-P-{ANO}-{SECUENCIAL} -> LIQ-P-2026-0001
- Liquidaciones Cliente: LIQ-C-{ANO}-{SECUENCIAL} -> LIQ-C-2026-0001

### Validaciones criticas
- Un lote no puede clasificarse si ya esta clasificado.
- Un lote no puede liquidarse si no esta clasificado (debe estar en estado 'clasificado' o 'asignado').
- Un pedido no puede recibir mas kg de los que solicita.
- Una asignacion no puede exceder el stock disponible del lote.
- kg_asignados y peso_bruto deben ser mayores a 0.
- Un adelanto no puede descontarse dos veces.
- Un adelanto en estado 'aplicado' debe tener liquidacion_id asignado (no NULL).
- Un adelanto con lote_id especifico solo puede aplicarse en la liquidacion de ese lote.
- Los precios por kg deben ser mayores a 0.
- Los pesos no pueden ser negativos.
- Forma de pago 'mixto': la app debe registrar el monto por cada medio (ej: S/ 500 efectivo + S/ 500 transferencia) en observaciones o en pagos parciales separados.

### Convenciones de moneda
- Moneda: Soles (S/)
- Decimales para montos: 2 (S/ 1,234.56)
- Decimales para pesos: 2 (123.45 kg)
- Decimales para porcentajes de humedad: 2 (12.50%)

---

## ESQUEMA DE BASE DE DATOS V2 — RESUMEN

| # | Tabla | Modulo | Registros tipicos |
|---|-------|--------|-------------------|
| 1 | personas | Personas | Productores y clientes |
| 2 | persona_roles | Personas | Roles por persona |
| 3 | categorias | Almacen | 11 categorias semilla |
| 4 | lotes | Almacen | Un registro por cargamento |
| 5 | lote_clasificacion | Almacen | N filas por lote (1 por categoria) |
| 6 | pedidos | Pedidos | Un registro por pedido de cliente |
| 7 | pedido_asignaciones | Pedidos | N filas por pedido (lotes asignados) |
| 8 | kardex | Kardex | Todos los movimientos del sistema |
| 9 | liquidaciones | Liquidaciones | Cabeceras de liquidacion |
| 10 | liquidacion_detalle | Liquidaciones | Detalle por categoria |
| 11 | adelantos | Liquidaciones | Adelantos a productores |

**Total: 11 tablas limpias. 0 views. 0 triggers. 0 stored procedures.**

---

## CONCLUSION

Este documento contiene TODA la logica de negocio necesaria para construir
Sayariq V2 desde cero. Cada modulo tiene:
- Que datos se capturan
- Que datos se muestran
- Que calculos se hacen
- Que validaciones se aplican
- Que movimientos se generan en el kardex
- Que estados tienen las entidades

La clave del sistema es que TODO fluye hacia el KARDEX:
- Producto: entrada -> clasificacion -> salida
- Dinero: adelanto -> liquidacion -> pago/cobro

Y las DEUDAS se rastrean naturalmente:
- Saldo negativo por persona = la empresa le debe
- Saldo positivo por persona = esa persona le debe a la empresa

No necesitas views, triggers, stored procedures, ni modulos adicionales.
Solo estas 11 tablas y la logica descrita aqui.
