"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  Plus,
  Search,
  X,
  Eye,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  createPersonaAction,
  togglePersonaEstadoAction,
  updatePersonaAction,
} from "@/app/personas/actions";

type Rol =
  | "productor"
  | "cliente"
  | "estibador"
  | "transportista"
  | "operador_planta"
  | "personal"
  | "supervisor"
  | "comprador"
  | "administrativo"
  | "calidad";

const ROLE_OPTIONS: Array<{ value: Rol; label: string }> = [
  { value: "productor", label: "Productor" },
  { value: "cliente", label: "Cliente" },
  { value: "estibador", label: "Estibador" },
  { value: "transportista", label: "Transportista" },
  { value: "operador_planta", label: "Operador de planta" },
  { value: "personal", label: "Personal" },
  { value: "supervisor", label: "Supervisor" },
  { value: "comprador", label: "Comprador" },
  { value: "administrativo", label: "Administrativo" },
  { value: "calidad", label: "Calidad" },
];

type Persona = {
  id: number;
  nombre_completo: string;
  tipo_documento: "DNI" | "RUC" | "CE";
  documento: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  banco: string | null;
  cuenta_bancaria: string | null;
  cci: string | null;
  estado: "activo" | "inactivo";
};

type FotoPersona = {
  thumb: string;
  image: string;
};

type Props = {
  personas: Persona[];
  rolesMap: Map<number, Rol[]>;
  fotoMap: Map<number, FotoPersona>;
  resumen: {
    totalActivas: number;
    productores: number;
    clientes: number;
  };
  successMessage?: string;
  alertMessage?: string;
};

const emptyForm: Persona = {
  id: 0,
  nombre_completo: "",
  tipo_documento: "DNI",
  documento: "",
  telefono: "",
  email: "",
  direccion: "",
  banco: "",
  cuenta_bancaria: "",
  cci: "",
  estado: "activo",
};

export default function PersonasModuleUI({
  personas,
  rolesMap,
  fotoMap,
  resumen,
  successMessage,
  alertMessage,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [query, setQuery] = useState("");
  const [rolFilter, setRolFilter] = useState("todos");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [selectedRoles, setSelectedRoles] = useState<Set<Rol>>(new Set());

  const filteredPersonas = useMemo(() => {
    let filtered = personas;

    // Filtro de texto
    if (query.trim()) {
      const term = query.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.nombre_completo.toLowerCase().includes(term) ||
          p.documento.toLowerCase().includes(term) ||
          (p.email?.toLowerCase().includes(term) ?? false)
      );
    }

    // Filtro de estado
    if (estadoFilter !== "todos") {
      filtered = filtered.filter((p) => p.estado === estadoFilter);
    }

    // Filtro de rol
    if (rolFilter !== "todos") {
      filtered = filtered.filter((p) => {
        const roles = rolesMap.get(p.id) ?? [];
        if (rolFilter === "ambos") {
          return roles.includes("productor") && roles.includes("cliente");
        }
        return roles.includes(rolFilter as Rol);
      });
    }

    return filtered;
  }, [personas, query, rolFilter, estadoFilter, rolesMap]);

  const openCreateModal = () => {
    setSelectedPersona(null);
    setSelectedRoles(new Set());
    setIsModalOpen(true);
  };

  const openEditModal = (persona: Persona) => {
    setSelectedPersona(persona);
    const roles = rolesMap.get(persona.id) ?? [];
    setSelectedRoles(new Set(roles));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPersona(null);
    setSelectedRoles(new Set());
  };

  const toggleRole = (rol: Rol) => {
    const newRoles = new Set(selectedRoles);
    if (newRoles.has(rol)) {
      newRoles.delete(rol);
    } else {
      newRoles.add(rol);
    }
    setSelectedRoles(newRoles);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedRoles.size === 0) {
      alert("Debes seleccionar al menos un rol");
      return;
    }

    const formData = new FormData(e.currentTarget);
    // Agregar roles seleccionados
    for (const rol of selectedRoles) {
      formData.append("roles", rol);
    }

    if (selectedPersona) {
      await updatePersonaAction(formData);
    } else {
      await createPersonaAction(formData);
    }

    closeModal();
    window.location.reload();
  };

  return (
    <main className="google-2027-theme relative min-h-screen bg-white text-gray-900">
      {/* Grid Background Pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.02,
          backgroundImage: "radial-gradient(#111827 0.8px, transparent 0.8px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative z-10">
        {/* Alertas */}
        <section className="mx-auto max-w-7xl px-3 py-3 md:px-6 md:py-4">
          {successMessage && (
            <div className="mb-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-sm animation-in fade-in slide-in-from-top-1 duration-300">
              ✓ {successMessage}
            </div>
          )}
          {alertMessage && (
            <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm animation-in fade-in slide-in-from-top-1 duration-300">
              ✕ {alertMessage}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-3 md:px-6">
          {/* Header */}
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Módulo 1: Personas</h1>
              <p className="mt-1.5 text-sm font-medium text-gray-600">
                Padrón maestro: productores, clientes y operación interna
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="sx-btn sx-btn-primary"
              >
                <Plus size={18} className="flex-shrink-0" />
                <span className="text-inherit">Registrar Persona</span>
              </button>
              <Link
                href="/"
                className="sx-btn sx-btn-secondary"
              >
                ← Inicio
              </Link>
            </div>
          </div>

          {/* Resumen Cards - Mejorado */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Total Personas Activas",
                value: resumen.totalActivas,
                color: "from-blue-50 to-blue-50",
                textColor: "text-[#1A73E8]",
                icon: "👥",
              },
              {
                label: "Productores Activos",
                value: resumen.productores,
                color: "from-green-50 to-green-50",
                textColor: "text-green-700",
                icon: "🌾",
              },
              {
                label: "Clientes Activos",
                value: resumen.clientes,
                color: "from-purple-50 to-purple-50",
                textColor: "text-purple-700",
                icon: "🏪",
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-xl border border-gray-200 bg-gradient-to-br ${card.color} p-4 shadow-sm transition duration-300 hover:shadow-md hover:border-gray-300`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.label}</p>
                    <p className={`mt-2 text-3xl font-bold ${card.textColor}`}>{card.value}</p>
                  </div>
                  <div className="text-4xl opacity-30">{card.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Buscador y Filtros - Mejorado */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, documento, email..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm font-medium outline-none transition duration-200 placeholder:text-gray-500 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                />
              </div>

              <select
                value={rolFilter}
                onChange={(e) => setRolFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
              >
                <option value="todos">Todos los roles</option>
                <option value="productor">Solo productores</option>
                <option value="cliente">Solo clientes</option>
                <option value="ambos">Productor y cliente</option>
              </select>

              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Tabla de Personas - Mejorada */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {filteredPersonas.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="text-4xl">📋</div>
                <p className="text-sm font-medium text-gray-600">Sin resultados con los filtros seleccionados</p>
                <p className="text-xs text-gray-500">Intenta cambiar los filtros o crear una nueva persona</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="sx-table">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Foto</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Nombre</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Documento</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Contacto</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Roles</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPersonas.map((persona) => {
                      const roles = rolesMap.get(persona.id) ?? [];
                      const foto = fotoMap.get(persona.id);

                      return (
                        <tr
                          key={persona.id}
                          className="transition duration-200 hover:bg-gray-50 hover:shadow-xs"
                        >
                          <td className="px-4 py-3">
                            {foto ? (
                              <a href={foto.image} target="_blank" rel="noopener noreferrer" title="Ver imagen">
                                <Image
                                  src={foto.thumb}
                                  alt={persona.nombre_completo}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
                                />
                              </a>
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                                {persona.nombre_completo
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{persona.nombre_completo}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-semibold text-gray-700">
                              {persona.tipo_documento} {persona.documento}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-600 space-y-0.5">
                              {persona.email && <p className="truncate">{persona.email}</p>}
                              {persona.telefono && <p>{persona.telefono}</p>}
                              {!persona.email && !persona.telefono && <p className="text-gray-400">-</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {roles.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {roles.map((rol) => (
                                  <span
                                    key={rol}
                                    className="inline-block rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-[#1A73E8]"
                                  >
                                    {rol}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 text-xs">-</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                                persona.estado === "activo"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {persona.estado === "activo" ? "✓ Activo" : "✕ Inactivo"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => openEditModal(persona)}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition duration-200 hover:border-[#1A73E8] hover:text-[#1A73E8] hover:bg-blue-50"
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal Formulario - Google 2027 Style */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm transition duration-300">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white shadow-2xl md:m-4 animation-in fade-in slide-in-from-bottom-16 md:zoom-in-95 duration-300">
            {/* Header Modal */}
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 px-6 py-5 md:rounded-t-2xl">
              <div className="flex-1">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  {selectedPersona ? `Editar: ${selectedPersona.nombre_completo}` : "Crear Nueva Persona"}
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-600">
                  {selectedPersona ? "Actualiza los datos de la persona" : "Completa todos los campos requeridos (*)"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1.5 text-gray-500 transition duration-200 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
              {selectedPersona && <input type="hidden" name="id" value={String(selectedPersona.id)} />}

              {/* Datos principales */}
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-1.5 md:col-span-2">
                  <span className="text-sm font-semibold text-gray-900">
                    Nombre Completo <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    name="nombre_completo"
                    defaultValue={selectedPersona?.nombre_completo ?? ""}
                    placeholder="e.g., Juan Pérez García"
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    required
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">
                    Tipo Documento <span className="text-red-500">*</span>
                  </span>
                  <select
                    name="tipo_documento"
                    defaultValue={selectedPersona?.tipo_documento ?? "DNI"}
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    required
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC (Económico)</option>
                    <option value="CE">CE (Carné Extranjería)</option>
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">
                    Documento <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    name="documento"
                    defaultValue={selectedPersona?.documento ?? ""}
                    placeholder="e.g., 12345678"
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    required
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">
                    Estado <span className="text-red-500">*</span>
                  </span>
                  <select
                    name="estado"
                    defaultValue={selectedPersona?.estado ?? "activo"}
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    required
                  >
                    <option value="activo">✓ Activo</option>
                    <option value="inactivo">✕ Inactivo</option>
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">Email</span>
                  <input
                    type="email"
                    name="email"
                    defaultValue={selectedPersona?.email ?? ""}
                    placeholder="correo@ejemplo.com"
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">Teléfono</span>
                  <input
                    type="tel"
                    name="telefono"
                    defaultValue={selectedPersona?.telefono ?? ""}
                    placeholder="+51 999 999 999"
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                  />
                </label>
              </div>

              {/* Fila 3: Dirección */}
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-gray-900">Dirección</span>
                <textarea
                  name="direccion"
                  defaultValue={selectedPersona?.direccion ?? ""}
                  placeholder="Calle, número, distrito, provincia..."
                  rows={3}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                />
              </label>

              {/* Fila 5: Datos Bancarios */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3.5 text-sm font-bold text-gray-900">Información Bancaria (Opcional)</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">Banco</span>
                    <input
                      type="text"
                      name="banco"
                      defaultValue={selectedPersona?.banco ?? ""}
                      placeholder="e.g., BCP"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">Cuenta Bancaria</span>
                    <input
                      type="text"
                      name="cuenta_bancaria"
                      defaultValue={selectedPersona?.cuenta_bancaria ?? ""}
                      placeholder="Número de cuenta"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-gray-700">CCI</span>
                    <input
                      type="text"
                      name="cci"
                      defaultValue={selectedPersona?.cci ?? ""}
                      placeholder="Código interbancario"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium outline-none transition duration-200 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20"
                    />
                  </label>
                </div>
              </div>

              {/* Fila 6: Roles */}
              <fieldset className="rounded-lg border border-gray-300 p-4">
                <legend className="text-sm font-bold text-gray-900">
                  Roles Asignados <span className="text-red-500">*</span>
                </legend>
                <p className="mb-3 text-xs text-gray-600">Selecciona mínimo 1 rol</p>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {ROLE_OPTIONS.map((role) => (
                    <label key={role.value} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedRoles.has(role.value)}
                        onChange={() => toggleRole(role.value)}
                        className="h-4 w-4 rounded border-gray-300 text-[#1A73E8] focus:ring-[#1A73E8]/20"
                      />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{role.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Fila 7: Foto */}
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-gray-900">Foto de Perfil (Opcional)</span>
                <input
                  type="file"
                  name="foto_persona"
                  accept="image/jpeg,image/png,image/webp"
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium file:mr-3 file:bg-gray-100 file:border-0 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-gray-700 hover:file:bg-gray-200"
                />
                <span className="text-xs text-gray-600">Se optimiza a máximo 1080px. Formatos: JPEG, PNG, WebP.</span>
              </label>

              {/* Botones de Acción */}
              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row">
                <button
                  type="submit"
                  className="flex-1 rounded-lg border border-[#1A73E8] bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#1765CC] hover:text-white hover:shadow-md active:bg-[#1450B0]"
                >
                  {selectedPersona ? "Guardar Cambios" : "Crear Persona"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
