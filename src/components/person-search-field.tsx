"use client";

import { useId, useState } from "react";
import { Search } from "lucide-react";

type PersonOption = {
  id: number;
  nombre_completo: string;
  tipo_documento?: string | null;
  documento?: string | null;
};

type Props = {
  name: string;
  label: string;
  people: PersonOption[];
  defaultId?: number;
  required?: boolean;
  placeholder?: string;
};

export default function PersonSearchField({
  name,
  label,
  people,
  defaultId = 0,
  required = false,
  placeholder = "Escribe nombre o DNI",
}: Props) {
  const initial = people.find((p) => p.id === defaultId) ?? null;
  const [selectedId, setSelectedId] = useState(initial?.id ?? 0);
  const [query, setQuery] = useState(
    initial ? `${initial.nombre_completo}${initial.documento ? ` · ${initial.documento}` : ""}` : ""
  );

  const listId = `${name}-person-search-${useId()}`;

  const selectedPerson = people.find((p) => p.id === selectedId) ?? null;

  const tryResolve = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      setSelectedId(0);
      return;
    }

    const exact = people.find((p) => {
      const labelText = `${p.nombre_completo}${p.documento ? ` · ${p.documento}` : ""}`.toLowerCase();
      return labelText === normalized;
    });

    if (exact) {
      setSelectedId(exact.id);
      return;
    }

    const contains = people.find((p) => {
      const haystack = `${p.nombre_completo} ${p.documento ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });

    setSelectedId(contains?.id ?? 0);
  };

  return (
    <div className="grid gap-1">
      <span className="text-sm">{label}{required ? " *" : ""}</span>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          list={listId}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            tryResolve(event.target.value);
          }}
          onBlur={(event) => tryResolve(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded border px-2 py-1 pl-8"
        />
      </div>
      <datalist id={listId}>
        {people.map((p) => (
          <option key={p.id} value={`${p.nombre_completo}${p.documento ? ` · ${p.documento}` : ""}`} />
        ))}
      </datalist>
      <input type="hidden" name={name} value={selectedId > 0 ? String(selectedId) : ""} required={required} />
      {selectedPerson ? (
        <div className="rounded border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-900">
          <strong>{selectedPerson.nombre_completo}</strong>
          {selectedPerson.tipo_documento || selectedPerson.documento
            ? ` · ${selectedPerson.tipo_documento ?? "Doc"}: ${selectedPerson.documento ?? "-"}`
            : ""}
        </div>
      ) : null}
    </div>
  );
}
