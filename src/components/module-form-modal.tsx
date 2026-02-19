"use client";

import { ReactNode, useState } from "react";
import { Plus, X } from "lucide-react";

type Props = {
  buttonLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export default function ModuleFormModal({
  buttonLabel,
  title,
  description,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2.5 rounded-lg border border-[#1A73E8] bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1765CC] hover:text-white hover:shadow-md active:shadow-none"
      >
        <Plus size={18} className="flex-shrink-0" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:m-4 md:rounded-2xl">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 px-6 py-5 md:rounded-t-2xl">
              <div className="flex-1">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1 text-xs font-medium text-gray-600">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-gray-500 transition duration-200 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar formulario"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
