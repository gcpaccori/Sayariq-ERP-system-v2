"use client";
// M5-PR-SYNC: cambio de traza para consolidar PR del módulo 5

import Image from "next/image";
import { useState } from "react";

function normalizeSrc(s: any) {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;
  // allow absolute http(s), root-relative, and data URIs
  if (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("/") || str.startsWith("data:")) return str;
  try {
    // try to construct URL (will throw for invalid)
    new URL(str);
    return str;
  } catch (e) {
    return null;
  }
}

export default function LiquidacionesResumenTable({
  liquidaciones,
  fotoMap = {},
  personaMap = {},
  compLiquidacionMap = {},
  loteMap = {},
  pedidoMap = {},
}: any) {
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const total = liquidaciones.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = liquidaciones.slice(start, end);

  return (
    <>
      {liquidaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="text-4xl">📋</div>
          <p className="text-sm font-medium text-gray-600">Sin liquidaciones.</p>
          <p className="text-xs text-gray-500">No se encontraron liquidaciones con los filtros actuales.</p>
        </div>
      ) : (
        <>
          <div className="block md:hidden space-y-3">
            {pageRows.map((row: any) => (
              <div key={row.id} className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                      {fotoMap[row.id] ? (
                        (() => {
                          const foto = (fotoMap[row.id] as any) ?? fotoMap[row.id];
                          const thumb = String(foto?.thumb ?? foto?.ruta_thumb ?? foto ?? "");
                          const image = String(foto?.image ?? foto?.ruta_imagen ?? foto ?? "");
                          const thumbSrc = normalizeSrc(thumb);
                          const imageSrc = normalizeSrc(image);
                          return thumbSrc ? (
                            <button onClick={() => setOpenUrl(imageSrc)} className="block">
                              <Image src={thumbSrc} alt={`Foto ${row.numero_liquidacion}`} width={64} height={64} className="h-16 w-16 rounded object-cover" />
                            </button>
                          ) : imageSrc ? (
                            <button onClick={() => setOpenUrl(imageSrc)} className="block">
                              <div className="h-16 w-16 overflow-hidden rounded bg-gray-100">
                                <Image src={imageSrc} alt={`Foto ${row.numero_liquidacion}`} width={64} height={64} className="h-16 w-16 object-cover" />
                              </div>
                            </button>
                          ) : (
                            <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">-</div>
                          );
                        })()
                      ) : (
                      <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">-</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{row.numero_liquidacion} — {personaMap[row.persona_id] ?? row.persona_id}</p>
                    <p className="text-xs text-gray-500">{row.tipo} · {row.fecha_liquidacion}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">S/ {row.total_a_pagar}</span>
                      <span className="text-xs text-gray-500">Estado: {row.estado}</span>
                      <button onClick={() => setOpenUrl(normalizeSrc((fotoMap as any)[row.id] ?? null))} className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-[#1A73E8]">Ver imagen</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Foto</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Nro. liquidación</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Comprobante</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Comp. interno</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Persona</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Lote/Pedido</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Total a pagar</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado pago</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pageRows.map((row: any) => (
                  <tr key={row.id} className="transition duration-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {fotoMap[row.id] ? (
                        (() => {
                          const foto = (fotoMap[row.id] as any) ?? fotoMap[row.id];
                          const thumb = String(foto?.thumb ?? foto?.ruta_thumb ?? foto ?? "");
                          const image = String(foto?.image ?? foto?.ruta_imagen ?? foto ?? "");
                          const thumbSrc = normalizeSrc(thumb);
                          const imageSrc = normalizeSrc(image);
                          return thumbSrc ? (
                            <button onClick={() => setOpenUrl(imageSrc)} className="block">
                              <Image
                                src={thumbSrc}
                                alt={`Liquidación ${row.numero_liquidacion}`}
                                width={56}
                                height={56}
                                className="h-14 w-14 rounded object-cover ring-1 ring-gray-200"
                              />
                            </button>
                          ) : imageSrc ? (
                            <button onClick={() => setOpenUrl(imageSrc)} className="block">
                              <div className="h-14 w-14 overflow-hidden rounded bg-gray-100 ring-1 ring-gray-200">
                                <Image src={imageSrc} alt={`Liquidación ${row.numero_liquidacion}`} width={56} height={56} className="h-14 w-14 object-cover" />
                              </div>
                            </button>
                          ) : (
                            <div className="h-14 w-14 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">-</div>
                          );
                        })()
                      ) : (
                        <div className="h-14 w-14 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">-</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{row.numero_liquidacion}</td>
                    <td className="px-4 py-3">{row.numero_comprobante ?? "-"}</td>
                    <td className="px-4 py-3">{compLiquidacionMap[row.id] ?? "-"}</td>
                    <td className="px-4 py-3">{row.tipo}</td>
                    <td className="px-4 py-3">{personaMap[row.persona_id] ?? row.persona_id}</td>
                    <td className="px-4 py-3">{row.lote_id ? loteMap[row.lote_id] ?? row.lote_id : row.pedido_id ? pedidoMap[row.pedido_id] ?? row.pedido_id : "-"}</td>
                    <td className="px-4 py-3">{row.fecha_liquidacion}</td>
                    <td className="px-4 py-3">S/ {row.total_a_pagar}</td>
                    <td className="px-4 py-3">{row.estado}</td>
                    <td className="px-4 py-3">{row.estado_pago}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const foto = (fotoMap[row.id] as any) ?? fotoMap[row.id];
                          const image = normalizeSrc(foto?.image ?? foto?.ruta_imagen ?? foto ?? null);
                          setOpenUrl(image || null);
                        }}
                        className="inline-flex items-center gap-2.5 rounded-lg bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1765CC]"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Filas por página:</label>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                {[5,10,20,50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setPage(1)} disabled={page === 1} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Primero</button>
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
              <span className="text-sm">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="inline-flex items-center gap-2 rounded-lg bg-[#1A73E8] px-3 py-1 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1765CC] disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Último</button>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {openUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpenUrl(null)}>
          <div className="max-h-[90vh] max-w-[90vw] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpenUrl(null)} className="mb-2 inline-flex items-center gap-2.5 rounded-lg bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1765CC]">Cerrar</button>
            <div className="rounded bg-white p-2">
              <Image src={openUrl} alt="Imagen" width={1200} height={800} className="h-auto w-full rounded object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
