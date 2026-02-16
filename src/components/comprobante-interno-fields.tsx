"use client";

import { useState } from "react";

export default function ComprobanteInternoFields() {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [precision, setPrecision] = useState("");
  const [status, setStatus] = useState("Sin GPS capturado");
  const [horaEvento] = useState(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  });

  const capturarGps = () => {
    if (!navigator.geolocation) {
      setStatus("Geolocalización no disponible en este dispositivo");
      return;
    }

    setStatus("Capturando GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setPrecision(String(position.coords.accuracy ?? ""));
        setStatus("GPS capturado correctamente");
      },
      (error) => {
        setStatus(`No se pudo capturar GPS: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <fieldset className="rounded border p-3">
      <legend className="px-1 text-sm">Datos de comprobante interno</legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm">Quién recibió (nombre)</span>
          <input name="receptor_nombre" className="rounded border px-2 py-1" />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Documento receptor</span>
          <input name="receptor_documento" className="rounded border px-2 py-1" />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Rol receptor</span>
          <input
            name="receptor_rol"
            placeholder="Ej: encargado de campo"
            className="rounded border px-2 py-1"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Lugar de recepción</span>
          <input
            name="lugar_recepcion"
            placeholder="Ej: Fundo San Miguel"
            className="rounded border px-2 py-1"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={capturarGps} className="rounded border px-3 py-1 text-sm">
          Capturar GPS del dispositivo
        </button>
        <span className="text-xs">{status}</span>
      </div>

      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
        <p>Lat: {lat || "-"}</p>
        <p>Lng: {lng || "-"}</p>
        <p>Precisión (m): {precision || "-"}</p>
      </div>

      <input type="hidden" name="gps_lat" value={lat} readOnly />
      <input type="hidden" name="gps_lng" value={lng} readOnly />
      <input type="hidden" name="gps_precision_m" value={precision} readOnly />
      <input type="hidden" name="hora_evento" value={horaEvento} readOnly />
    </fieldset>
  );
}
