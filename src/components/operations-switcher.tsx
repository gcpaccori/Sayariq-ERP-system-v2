"use client";

import { ReactNode, useState } from "react";

type Props = {
  adelantoContent: ReactNode;
  pagoContent: ReactNode;
};

export default function OperationsSwitcher({ adelantoContent, pagoContent }: Props) {
  const [activeAction, setActiveAction] = useState<"adelanto" | "pago">("adelanto");

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setActiveAction("adelanto")}
          aria-pressed={activeAction === "adelanto"}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeAction === "adelanto"
              ? "bg-[#1A73E8] text-white shadow-sm"
              : "bg-transparent text-gray-700 hover:bg-white"
          }`}
        >
          Registrar adelanto
        </button>
        <button
          type="button"
          onClick={() => setActiveAction("pago")}
          aria-pressed={activeAction === "pago"}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeAction === "pago"
              ? "bg-[#1A73E8] text-white shadow-sm"
              : "bg-transparent text-gray-700 hover:bg-white"
          }`}
        >
          Registrar pago de liquidación
        </button>
      </div>

      <div>{activeAction === "adelanto" ? adelantoContent : pagoContent}</div>
    </div>
  );
}
