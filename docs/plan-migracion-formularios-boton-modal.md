# Hallazgos y plan (issue ➜ tarea)

Este documento consolida el plan de migración para que **todos los formularios** se abran desde **botones** (patrón módulo 1), con diseño responsive y sin perder funcionalidad.

---

## 1) No existe un patrón único reutilizable de “botón + modal responsive” para formularios
Hoy hay mezcla de formularios inline, en cards y en componentes distintos; eso dificulta consistencia UX y responsive en móviles.

### Tarea sugerida
**Crear patrón reusable de formulario modal tipo módulo 1 para toda la app**

### Empezar tarea
1. Tomar como referencia `src/components/personas-module-ui.tsx` (modal de crear persona).
2. Crear `src/components/action-form-modal.tsx` reutilizable.
3. Definir API estándar: `title`, `description`, `trigger`, `open`, `onOpenChange`, `children`, `size`.
4. Asegurar comportamiento móvil: `w-full`, `max-h-[90vh]`, `overflow-y-auto`, header/footer claros.
5. Incluir accesibilidad base: foco inicial, cierre con `Esc`, `aria-*`.

---

## 2) Módulo 2/3/4/5/6/8 todavía tienen formularios inline (no “metidos a botón”)
Esto incumple tu requerimiento de que todos operen como módulo 1.

### Tarea sugerida
**Migrar todos los formularios de módulos a trigger por botón (sin desplegables)**

### Empezar tarea
1. Migrar formularios de:
   - `src/app/pedidos/page.tsx`
   - `src/app/almacen/page.tsx`
   - `src/app/cobranzas/page.tsx`
   - `src/app/liquidaciones/page.tsx`
   - `src/app/kardex/page.tsx`
   - `src/app/analitica/page.tsx`
   - `src/components/EstadoCuentaComponents.tsx`
   - `src/components/rentabilidad-filters.tsx`
   - `src/components/pago-liquidacion-form.tsx`
2. Dejar solo botón disparador en vista principal; formulario dentro de modal.
3. Mantener `action={...}` / `onSubmit` originales.
4. No usar `details/summary` ni secciones desplegables.

---

## 3) Falta estandarización responsive en layout interno de formularios al pasarlos a modal
Si solo se encapsula sin rehacer estructura, puede romperse en móvil o quedar comprimido.

### Tarea sugerida
**Aplicar grid responsive uniforme dentro de cada formulario modal sin perder campos**

### Empezar tarea
1. Estandarizar formularios con `grid gap-3` y columnas progresivas por breakpoint.
2. En móvil, campos largos/clave en `col-span-full`.
3. Añadir `min-w-0` en contenedores flex/grid para evitar desborde.
4. Evitar anchos fijos que empujen el contenido fuera de pantalla.
5. Validar visualmente en 360, 390, 768, 1024, 1280 px.

---

## 4) Riesgo de pérdida funcional al mover formularios con flujos especiales (persona/lote/pagos)
Hay formularios con dependencias de búsqueda, selección temporal y pasos posteriores.

### Tarea sugerida
**Preservar flujos especiales y dependencias al migrar formularios a modal**

### Empezar tarea
1. Identificar formularios con estado previo obligatorio (persona/lote/liquidación).
2. Mantener hidden fields y nombres de campos exactamente iguales.
3. Preservar buscador tipo lupa y preview de persona seleccionada donde aplique.
4. Cerrar modal solo en éxito; en error, mantener abierto con feedback.
5. Confirmar continuidad del flujo actual sin cambios de negocio.

---

## 5) Falta checklist de paridad funcional para garantizar “sin perder campo o funcionalidad”
Sin checklist, es fácil omitir un campo al migrar 18 formularios.

### Tarea sugerida
**Crear matriz de paridad funcional por formulario antes y después de la migración**

### Empezar tarea
1. Crear `docs/form-migration-checklist.md`.
2. Por formulario registrar: campos, validaciones, submit, resultado esperado.
3. Marcar paridad solo si:
   - no falta ningún campo,
   - no cambia acción/handler,
   - resultado funcional es el mismo.
4. Incluir verificación móvil y desktop por formulario.

---

## 6) Hay posible duplicidad funcional entre componentes de módulo y páginas `app/*`
Se detecta `src/components/almacen-module-ui.tsx` con form propio además de `src/app/almacen/page.tsx`; esto suele causar inconsistencias.

### Tarea sugerida
**Depurar formularios duplicados y consolidar una sola fuente por módulo**

### Empezar tarea
1. Mapear qué UI está activa realmente en rutas `src/app/*`.
2. Identificar componentes legacy no montados o duplicados.
3. Consolidar una sola fuente por módulo.
4. Eliminar o desconectar duplicados para evitar regresiones futuras.

---

## Checks ejecutados
- ✅ `rg -n "<form|form action=" src/app src/components | sort`
  - Usado para inventariar formularios actuales por archivo y línea.

