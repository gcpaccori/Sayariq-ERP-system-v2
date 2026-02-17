'use client';

import { createPagoLiquidacionAction } from '@/app/liquidaciones/actions';
import { useRef } from 'react';
import ComprobanteInternoFields from './comprobante-interno-fields';

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

    // Limpiar campos del formulario (excepto liquidacion_id y fecha)
    if (formRef.current) {
      const inputs = formRef.current.querySelectorAll('input:not([name="liquidacion_id"]):not([name="fecha_pago"]), textarea');
      inputs.forEach((input: any) => {
        if (input.type === 'number' || input.type === 'text' || input.tagName === 'TEXTAREA') {
          input.value = '';
        }
      });
      const selects = formRef.current.querySelectorAll('select:not([name="liquidacion_id"])');
      selects.forEach((select: any) => {
        select.value = '';
      });
    }

    // Mostrar detalles
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
            <div><strong>Saldo pendiente:</strong> S/ ${round2(
              Math.max(0, liq.total_a_pagar - (liq.monto_pagado ?? 0))
            )}</div>
            <div><strong>Estado:</strong> ${liq.estado_pago}</div>
          </div>
        </div>
      `;
    }

    // Mostrar historial de pagos si existe lote_id
    const historialEl = document.getElementById('liq-pagos-historial');
    if (historialEl) {
      historialEl.style.display = liq.lote_id ? 'block' : 'none';
    }

    // Mostrar adelantos del productor
    const adelantosEl = document.getElementById('liq-adelantos');
    if (adelantosEl) {
      adelantosEl.style.display = 'block';
    }

    // Actualizar tablas dinámicamente
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
    <section className="mb-6 rounded border p-4">
      <h2 className="mb-3 text-lg font-semibold">Registrar pago de liquidación</h2>
      <p className="mb-3 text-xs">
        Selecciona una liquidación para ver su detalle, historial de pagos y adelantos del productor.
      </p>

      <form ref={formRef} action={createPagoLiquidacionAction} className="grid gap-3">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          {/* Seleccionar liquidación */}
          <label style={{ display: 'grid', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Liquidación *</span>
            <select
              name="liquidacion_id"
              defaultValue=""
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              required
              onChange={handleLiquidacionChange}
            >
              <option value="" disabled>
                Seleccionar liquidación
              </option>
              {liquidaciones
                .filter(
                  (row) =>
                    row.estado === 'confirmada' &&
                    row.estado_pago !== 'pagado' &&
                    row.estado_pago !== 'cobrado'
                )
                .map((row) => (
                  <option key={row.id} value={String(row.id)}>
                    {row.numero_liquidacion} ({row.tipo}) - {personaMap.get(row.persona_id) || `(ID ${row.persona_id})`} - Saldo: S/{' '}
                    {round2(Math.max(0, row.total_a_pagar - (row.monto_pagado ?? 0)))}
                  </option>
                ))}
            </select>
          </label>

          {/* Monto */}
          <label style={{ display: 'grid', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Monto a pagar *</span>
            <input
              name="monto_pago"
              type="number"
              min="0"
              step="0.01"
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              required
              placeholder="0.00"
            />
          </label>

          {/* Fecha */}
          <label style={{ display: 'grid', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Fecha *</span>
            <input
              name="fecha_pago"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              required
            />
          </label>

          {/* Forma pago */}
          <label style={{ display: 'grid', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Forma de pago</span>
            <select
              name="forma_pago"
              defaultValue=""
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">(sin definir)</option>
              <option value="efectivo">efectivo</option>
              <option value="transferencia">transferencia</option>
              <option value="cheque">cheque</option>
              <option value="mixto">mixto</option>
            </select>
          </label>

          {/* Numero comprobante */}
          <label style={{ display: 'grid', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>N° comprobante</span>
            <input
              name="numero_comprobante"
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="Ref. bancaria o interno"
            />
          </label>
        </div>

        {/* Detalle de liquidación seleccionada */}
        <div id="liq-detalle" style={{ display: 'none' }}></div>

        {/* Historial de pagos del lote */}
        <div id="liq-pagos-historial" style={{ display: 'none', marginTop: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Historial de pagos de este lote
          </h3>
          <div
            id="liq-pagos-tabla"
            style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}
          ></div>
        </div>

        {/* Adelantos pendientes del productor */}
        <div id="liq-adelantos" style={{ display: 'none', marginTop: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Adelantos pendientes del productor
          </h3>
          <div
            id="liq-adelantos-tabla"
            style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}
          ></div>
        </div>

        {/* Observaciones */}
        <label style={{ display: 'grid', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Observaciones y decisiones</span>
          <textarea
            name="observaciones"
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              minHeight: '60px',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
            placeholder="Ej: Este pago cubre el adelanto de enero, el resto sigue en deuda..."
          />
        </label>

        <ComprobanteInternoFields />

        <div style={{ marginTop: '16px' }}>
          <button
            type="submit"
            className="inline-flex items-center gap-2.5 rounded-lg bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1765CC] hover:shadow-md active:shadow-none"
          >
            Registrar pago
          </button>
        </div>
      </form>
    </section>
  );
}
