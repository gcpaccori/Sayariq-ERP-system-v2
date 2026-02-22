"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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

const getPersonLabel = (person: PersonOption) =>
  `${person.nombre_completo}${person.documento ? ` · ${person.documento}` : ""}`;

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
  const [query, setQuery] = useState(initial ? getPersonLabel(initial) : "");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputId = `${name}-person-search-${useId()}`;

  const selectedPerson = people.find((p) => p.id === selectedId) ?? null;

  const filteredPeople = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return people;
    }

    return people.filter((person) => {
      const haystack = `${person.nombre_completo} ${person.documento ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [people, query]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedId(0);
    setIsOpen(true);
  };

  const handleSelectPerson = (person: PersonOption) => {
    setSelectedId(person.id);
    setQuery(getPersonLabel(person));
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative grid min-w-0 gap-1">
      <label htmlFor={inputId} className="text-sm">
        {label}
        {required ? " *" : ""}
      </label>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          id={inputId}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full min-w-0 rounded border px-2 py-1 pl-8"
        />
      </div>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-full max-w-full overflow-hidden rounded border border-gray-200 bg-white shadow-lg">
          <div className="max-h-56 overflow-y-auto overflow-x-hidden">
          {filteredPeople.length > 0 ? (
            filteredPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => handleSelectPerson(person)}
                className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blue-50"
              >
                <div className="truncate font-medium text-gray-900" title={person.nombre_completo}>{person.nombre_completo}</div>
                {person.tipo_documento || person.documento ? (
                  <div className="truncate text-xs text-gray-500" title={`${person.tipo_documento ?? "Doc"}: ${person.documento ?? "-"}`} >
                    {person.tipo_documento ?? "Doc"}: {person.documento ?? "-"}
                  </div>
                ) : null}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
          )}
          </div>
        </div>
      ) : null}

      <input
        type="hidden"
        name={name}
        value={selectedId > 0 ? String(selectedId) : ""}
        required={required}
      />

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
