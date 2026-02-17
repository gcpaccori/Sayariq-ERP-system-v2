'use client';
import { createPagoLiquidacionAction } from '@/app/liquidaciones/actions';
import { useRef } from 'react';

interface Liquidacion {
  id: number;
  numero_liquidacion: string;
  tipo: 'productor' | 'cliente' | 'venta';
  persona_id: number;
  lote_id?: number | null;
  pedido_id?: number | null;
  total_a_pagar: number;
  monto_pagado?: number | null;
  estado: string;
  estado_pago: string;
}

interface PagoLiquidacion {
  id: number;
  liquidacion_id: number;
  lote_id?: number | null;
  monto: number;
  fecha: string;
  forma_pago?: string | null;
  numero_comprobante?: string | null;
  observaciones?: string | null;
}

interface Adelanto {
  id: number;
  productor_id: number;
  lote_id?: number | null;
  numero_comprobante?: string | null;
  monto: number;
  fecha: string;
  motivo?: string | null;
  estado: string;
  liquidacion_id?: number | null;
}

interface PagoLiquidacionFormProps {
  liquidaciones: Liquidacion[];
  pagosLiquidacion: PagoLiquidacion[];
  adelantosProductor: Adelanto[];
  personaMap: Map<number, string>;
  loteMap: Map<number, string>;
  pedidoMap: Map<number, string>;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function obtenerGeolocation() {
  if (!navigator.geolocation) {
    alert('Geolocalización no soportada en este navegador');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const precision = Math.round(position.coords.accuracy);

      const latInput = document.querySelector('input[name="gps_lat"]') as HTMLInputElement;
      const lngInput = document.querySelector('input[name="gps_lng"]') as HTMLInputElement;
      const precInput = document.querySelector('input[name="gps_precision_m"]') as HTMLInputElement;

      if (latInput) latInput.value = lat.toFixed(6);
      if (lngInput) lngInput.value = lng.toFixed(6);
      if (precInput) precInput.value = precision.toString();

      const horaInput = document.querySelector('input[name="hora_evento"]') as HTMLInputElement;
      if (horaInput) {
        const now = new Date();
        horaInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      }
    },
    (error) => {
      alert('Error al obtener ubicación: ' + error.message);
    }
  );
}

export function PagoLiquidacionForm({
  liquidaciones,
  pagosLiquidacion,
  adelantosProductor,
  personaMap,
  loteMap,
  pedidoMap,
}: PagoLiquidacionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleLiquidacionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const liqId = e.target.value;
    if (!liqId) return;

    const liq = liquidaciones.find((l) => String(l.id) === liqId);
    if (!liq) return;

    if (formRef.current) {
      const inputs = formRef.current.querySelectorAll('input:not([name="liquidacion_id"]):not([name="fecha_pago"]), textarea');
      inputs.forEach((input) => {
        if (input.type === 'number' || input.type === 'text' || input.tagName === 'TEXTAREA') {
          input.value = '';
        }
      });
      const selects = formRef.current.querySelectorAll('select:not([name="liquidacion_id"])');
      selects.forEach((select) => {
        select.value = '';
      });
    }

    const detalleEl = document.getElementById('liq-detalle');
    if (detalleEl) {
      detalleEl.innerHTML = `
        <div style="padding: 12px; background: #f5f5f5; border-radius: 4px; border-left: 3px solid #1976d2;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; font-size: 12px;">
            <div><strong>Número:</strong> ${liq.numero_liquidacion}</div>
            <div><strong>Tipo:</strong> ${liq.tipo}</div>
            <div><strong>Persona:</strong> ${personaMap.get(liq.persona_id) || liq.persona_id}</div>
            ${liq.lote_id ? `<div><strong>Lote:</strong> ${loteMap.get(liq.lote_id) || liq.lote_id}</div>` : ''}
            ${liq.pedido_id ? `<div><strong>Pedido:</strong> ${pedidoMap.get(liq.pedido_id) || liq.pedido_id}</div>` : ''}
            <div><strong>Total a pagar:</strong> S/ ${round2(liq.total_a_pagar)}</div>
            <div><strong>Ya pagado:</strong> S/ ${round2(liq.monto_pagado ?? 0)}</div>
            <div><strong>Saldo pendiente:</strong> S/ ${round2(Math.max(0, liq.total_a_pagar - (liq.monto_pagado ?? 0)))}</div>
            <div><strong>Estado:</strong> ${liq.estado_pago}</div>
          </div>
        </div>
      `;
    }

    const historialEl = document.getElementById('liq-pagos-historial');
    if (historialEl) historialEl.style.display = liq.lote_id ? 'block' : 'none';

    const adelantosEl = document.getElementById('liq-adelantos');
    if (adelantosEl) adelantosEl.style.display = 'block';

    if (liq.lote_id) {
      const pag = pagosLiquidacion.filter((p) => p.lote_id === liq.lote_id);
      let html = "<table style='width: 100%; border-collapse: collapse; font-size: 12px;'>";
      html += "<tr style='background: #f5f5f5;'><th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Fecha</th><th style='border: 1px solid #ddd; padding: 8px;'>Monto</th><th style='border: 1px solid #ddd; padding: 8px;'>Forma</th><th style='border: 1px solid #ddd; padding: 8px;'>Comprobante</th></tr>";

      if (pag.length > 0) {
        pag.forEach((p) => {
          html +=
            '<tr><td style="border: 1px solid #ddd; padding: 8px;">' +
            new Date(p.fecha).toLocaleDateString() +
            '</td><td style="border: 1px solid #ddd; padding: 8px; text-align: right;">S/ ' +
            parseFloat(String(p.monto)).toFixed(2) +
            '</td><td style="border: 1px solid #ddd; padding: 8px;">' +
            (p.forma_pago || '-') +
            '</td><td style="border: 1px solid #ddd; padding: 8px;">' +
            (p.numero_comprobante || '-') +
            '</td></tr>';
        });
      } else {
        html += '<tr><td colSpan={4} style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #999;">Sin pagos registrados para este lote</td></tr>';
      }

      html += '</table>';
      const tabla = document.getElementById('liq-pagos-tabla');
      if (tabla) tabla.innerHTML = html;
    }

    const adelantos = adelantosProductor.filter((a) => a.productor_id === liq.persona_id);
    let adelantosHtml = "<table style='width: 100%; border-collapse: collapse; font-size: 12px;'>";
    adelantosHtml += "<tr style='background: #f5f5f5;'><th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Fecha</th><th style='border: 1px solid #ddd; padding: 8px;'>Monto</th><th style='border: 1px solid #ddd; padding: 8px;'>Motivo</th><th style='border: 1px solid #ddd; padding: 8px;'>Lote</th></tr>";

    if (adelantos.length > 0) {
      adelantos.forEach((a) => {
        adelantosHtml +=
          '<tr><td style="border: 1px solid #ddd; padding: 8px;">' +
          new Date(a.fecha).toLocaleDateString() +
          '</td><td style="border: 1px solid #ddd; padding: 8px; text-align: right;">S/ ' +
          parseFloat(String(a.monto)).toFixed(2) +
          '</td><td style="border: 1px solid #ddd; padding: 8px;">' +
          (a.motivo || '-') +
          '</td><td style="border: 1px solid #ddd; padding: 8px;">' +
          (a.lote_id || '-') +
          '</td></tr>';
      });
    } else {
      adelantosHtml += '<tr><td colSpan={4} style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #999;">Sin adelantos pendientes</td></tr>';
    }

    adelantosHtml += '</table>';
    const adelantosTabla = document.getElementById('liq-adelantos-tabla');
    if (adelantosTabla) adelantosTabla.innerHTML = adelantosHtml;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Registrar pago de liquidación</h3>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Flujo: 5 pasos</span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Comprobante interno opcional</span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Evidencia opcional</span>
        </div>
      </div>

      <form ref={formRef} action={createPagoLiquidacionAction} className="grid gap-4">
        <section className="rounded-xl border border-gray-100 p-3 md:p-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">Paso 1: Selección</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Liquidación *</span>
              <select
                name="liquidacion_id"
                defaultValue=""
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                required
                onChange={handleLiquidacionChange}
              >
                <option value="" disabled>
                  Seleccionar liquidación
                </option>
                {liquidaciones
                  .filter((row) => row.estado === 'confirmada' && row.estado_pago !== 'pagado' && row.estado_pago !== 'cobrado')
                  .map((row) => (
                    <option key={row.id} value={String(row.id)}>
                      {row.numero_liquidacion} ({row.tipo}) - Productor/Cliente: {personaMap.get(row.persona_id) || `(ID ${row.persona_id})`} - Saldo: S/ {round2(Math.max(0, row.total_a_pagar - (row.monto_pagado ?? 0)))}
                    </option>
                  ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold">Monto a pagar *</span>
              <input name="monto_pago" type="number" min="0" step="0.01" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" required placeholder="0.00" />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold">Fecha *</span>
              <input name="fecha_pago" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 p-3 md:p-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">Paso 2: Pago</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Forma de pago</span>
              <select name="forma_pago" defaultValue="" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">(sin definir)</option>
                <option value="efectivo">efectivo</option>
                <option value="transferencia">transferencia</option>
                <option value="cheque">cheque</option>
                <option value="mixto">mixto</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold">N° comprobante</span>
              <input name="numero_comprobante" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ref. bancaria o interno" />
            </label>
          </div>
        </section>

        <div id="liq-detalle" className="rounded-xl border border-gray-100 p-3 md:p-4" style={{ display: "none" }}></div>

        <div id="liq-pagos-historial" className="mt-1 rounded-xl border border-gray-100 p-3 md:p-4" style={{ display: "none" }}>
          <h3 className="mb-2 text-sm font-semibold">Historial de pagos de este lote</h3>
          <div id="liq-pagos-tabla" className="overflow-x-auto rounded-md border border-gray-100"></div>
        </div>

        <div id="liq-adelantos" className="mt-1 rounded-xl border border-gray-100 p-3 md:p-4" style={{ display: "none" }}>
          <h3 className="mb-2 text-sm font-semibold">Adelantos pendientes del productor</h3>
          <div id="liq-adelantos-tabla" className="overflow-x-auto rounded-md border border-gray-100"></div>
        </div>

        <section className="rounded-xl border border-gray-100 p-3 md:p-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">Paso 3: Observaciones</h4>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Observaciones y decisiones</span>
            <textarea name="observaciones" className="min-h-[80px] rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ej: Este pago cubre el adelanto de enero, el resto sigue en deuda..." />
          </label>
        </section>

        <details className="rounded-xl border border-gray-100 p-3 md:p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">Paso 4 (opcional): Comprobante interno</summary>
          <fieldset className="mt-3 rounded-md border border-gray-100 p-3">
            <legend className="px-1 text-sm font-semibold">Datos del comprobante interno (opcional)</legend>
            <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs">Receptor (nombre)</span>
                <input name="receptor_nombre" className="rounded border border-gray-300 px-3 py-2 text-sm" placeholder="Ej: Juan Pérez" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs">Documento</span>
                <input name="receptor_documento" className="rounded border border-gray-300 px-3 py-2 text-sm" placeholder="DNI o RUC" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs">Rol del receptor</span>
                <input name="receptor_rol" className="rounded border border-gray-300 px-3 py-2 text-sm" placeholder="productor, cliente, etc" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs">Lugar de entrega</span>
                <input name="lugar_recepcion" className="rounded border border-gray-300 px-3 py-2 text-sm" placeholder="Oficina, campo, etc" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs">Hora del evento</span>
                <input name="hora_evento" type="time" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <div className="flex items-end">
                <button type="button" onClick={() => obtenerGeolocation()} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                  📍 Obtener GPS actual
                </button>
              </div>
              <label className="grid gap-1">
                <span className="text-xs">GPS Latitud</span>
                <input name="gps_lat" type="number" step="0.000001" className="rounded border border-gray-300 px-3 py-2 text-sm" placeholder="-12.0462" readOnly />
              </label>
              <label className="grid gap-1">
                <span className="text-xs">GPS Longitud</span>
                <input name="gps_lng" type="number" step="0.000001" className="rounded border border-gray-300 px-3 py-2 text-sm" placeholder="-77.0372" readOnly />
              </label>
              <label className="grid gap-1">
                <span className="text-xs">Precisión GPS (metros)</span>
                <input name="gps_precision_m" type="number" step="0.01" className="rounded border border-gray-300 px-3 py-2 text-sm" placeholder="5" readOnly />
              </label>
            </div>
          </fieldset>
        </details>

        <details className="rounded-xl border border-gray-100 p-3 md:p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">Paso 5 (opcional): Evidencia</summary>
          <label className="mt-3 grid gap-1">
            <span className="text-sm">Foto evidencia (opcional)</span>
            <input type="file" name="foto_evidencia" accept="image/jpeg,image/png,image/webp" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <span className="text-xs text-gray-500">Se optimiza automáticamente a máximo 1080px y se genera miniatura.</span>
          </label>
        </details>

        <div className="mt-2 flex justify-end rounded-xl border-t border-gray-200 pt-3">
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1765CC]">Registrar pago</button>
        </div>
      </form>
    </div>
  );
}
