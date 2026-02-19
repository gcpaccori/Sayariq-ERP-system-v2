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
  Users,
  Sprout,
  ShoppingBag,
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
    <main className="p-4 md:p-6 space-y-6">
      {/* Alertas */}
      {successMessage && (
        <div className="erp-alert-success">{successMessage}</div>
      )}
      {alertMessage && (
        <div className="erp-alert-error">{alertMessage}</div>
      )}

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Personas</h1>
          <p className="mt-1 text-sm text-text-secondary">Padron maestro: productores, clientes y operacion interna</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="erp-btn-primary"
        >
          <Plus size={16} />
          Registrar Persona
        </button>
      </div>

      {/* KPI Cards */}
      <div className="erp-kpi-grid">
        {[
          { label: "Personas Activas", value: resumen.totalActivas, icon: Users, iconBg: "bg-blue-50", iconColor: "text-accent" },
          { label: "Productores", value: resumen.productores, icon: Sprout, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
          { label: "Clientes", value: resumen.clientes, icon: ShoppingBag, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="erp-stat-card">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <Icon size={18} className={card.iconColor} />
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary">{card.label}</p>
                  <p className="text-xl font-semibold text-text-primary">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="erp-card p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, documento, email..."
              className="erp-input pl-9"
            />
          </div>
          <select
            value={rolFilter}
            onChange={(e) => setRolFilter(e.target.value)}
            className="erp-input"
          >
            <option value="todos">Todos los roles</option>
            <option value="productor">Solo productores</option>
            <option value="cliente">Solo clientes</option>
            <option value="ambos">Productor y cliente</option>
          </select>
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="erp-input"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="erp-card overflow-hidden">
        {filteredPersonas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <AlertCircle size={24} className="text-text-muted" />
            <p className="text-sm font-medium text-text-secondary">Sin resultados con los filtros seleccionados</p>
            <p className="text-xs text-text-muted">Intenta cambiar los filtros o crear una nueva persona</p>
              </div>
            ) : (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th className="text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                    {filteredPersonas.map((persona) => {
                      const roles = rolesMap.get(persona.id) ?? [];
                      const foto = fotoMap.get(persona.id);

                      return (
                    <tr key={persona.id}>
                      <td>
                        {foto ? (
                          <a href={foto.image} target="_blank" rel="noopener noreferrer" title="Ver imagen">
                            <Image
                              src={foto.thumb}
                              alt={persona.nombre_completo}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
                            />
                          </a>
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-accent-light flex items-center justify-center text-xs font-semibold text-accent">
                            {persona.nombre_completo.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                          </div>
                        )}
                      </td>
                      <td>
                        <p className="font-medium text-text-primary">{persona.nombre_completo}</p>
                      </td>
                      <td>
                        <span className="inline-block rounded-lg bg-background px-2 py-0.5 font-mono text-xs text-text-secondary">
                          {persona.tipo_documento} {persona.documento}
                        </span>
                      </td>
                      <td>
                        <div className="text-xs text-text-secondary space-y-0.5">
                          {persona.email && <p className="truncate">{persona.email}</p>}
                          {persona.telefono && <p>{persona.telefono}</p>}
                          {!persona.email && !persona.telefono && <p className="text-text-muted">-</p>}
                        </div>
                      </td>
                      <td>
                        {roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {roles.map((rol) => (
                              <span key={rol} className="erp-badge bg-accent-light text-accent">
                                {rol}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-text-muted text-xs">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`erp-badge ${persona.estado === "activo" ? "bg-success-light text-success" : "bg-danger-light text-danger"}`}>
                          {persona.estado === "activo" ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => openEditModal(persona)}
                            className="erp-btn-secondary text-xs py-1.5 px-3"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-surface shadow-2xl md:m-4">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-surface px-6 py-5 md:rounded-t-2xl z-10">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-text-primary">
                  {selectedPersona ? `Editar: ${selectedPersona.nombre_completo}` : "Crear Nueva Persona"}
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
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

              {/* Fila 1: Nombre y Tipo Documento */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-text-primary">
                    Nombre Completo <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    name="nombre_completo"
                    defaultValue={selectedPersona?.nombre_completo ?? ""}
                    placeholder="e.g., Juan Pérez García"
                    className="erp-input"
                    required
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-text-primary">
                    Tipo Documento <span className="text-red-500">*</span>
                  </span>
                  <select
                    name="tipo_documento"
                    defaultValue={selectedPersona?.tipo_documento ?? "DNI"}
                    className="erp-input"
                    required
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC (Económico)</option>
                    <option value="CE">CE (Carné Extranjería)</option>
                  </select>
                </label>
              </div>

              {/* Fila 2: Documento y Estado */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-text-primary">
                    Documento <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    name="documento"
                    defaultValue={selectedPersona?.documento ?? ""}
                    placeholder="e.g., 12345678"
                    className="erp-input"
                    required
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-text-primary">
                    Estado <span className="text-red-500">*</span>
                  </span>
                  <select
                    name="estado"
                    defaultValue={selectedPersona?.estado ?? "activo"}
                    className="erp-input"
                    required
                  >
                    <option value="activo">✓ Activo</option>
                    <option value="inactivo">✕ Inactivo</option>
                  </select>
                </label>
              </div>

              {/* Fila 3: Email y Teléfono */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-text-primary">Email</span>
                  <input
                    type="email"
                    name="email"
                    defaultValue={selectedPersona?.email ?? ""}
                    placeholder="correo@ejemplo.com"
                    className="erp-input"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-text-primary">Teléfono</span>
                  <input
                    type="tel"
                    name="telefono"
                    defaultValue={selectedPersona?.telefono ?? ""}
                    placeholder="+51 999 999 999"
                    className="erp-input"
                  />
                </label>
              </div>

              {/* Fila 4: Dirección */}
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-text-primary">Dirección</span>
                <textarea
                  name="direccion"
                  defaultValue={selectedPersona?.direccion ?? ""}
                  placeholder="Calle, número, distrito, provincia..."
                  rows={3}
                  className="erp-input"
                />
              </label>

              {/* Fila 5: Datos Bancarios */}
              <div className="rounded-xl border border-border-light bg-background p-4">
                <p className="mb-3 text-sm font-medium text-text-primary">Informacion Bancaria (Opcional)</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-text-secondary">Banco</span>
                    <input
                      type="text"
                      name="banco"
                      defaultValue={selectedPersona?.banco ?? ""}
                      placeholder="e.g., BCP"
                      className="erp-input"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-text-secondary">Cuenta Bancaria</span>
                    <input
                      type="text"
                      name="cuenta_bancaria"
                      defaultValue={selectedPersona?.cuenta_bancaria ?? ""}
                      placeholder="Número de cuenta"
                      className="erp-input"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-text-secondary">CCI</span>
                    <input
                      type="text"
                      name="cci"
                      defaultValue={selectedPersona?.cci ?? ""}
                      placeholder="Código interbancario"
                      className="erp-input"
                    />
                  </label>
                </div>
              </div>

              {/* Fila 6: Roles */}
              <fieldset className="rounded-xl border border-border p-4">
                <legend className="text-sm font-medium text-text-primary">
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
                <span className="text-sm font-medium text-text-primary">Foto de Perfil (Opcional)</span>
                <input
                  type="file"
                  name="foto_persona"
                  accept="image/jpeg,image/png,image/webp"
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium file:mr-3 file:bg-gray-100 file:border-0 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-gray-700 hover:file:bg-gray-200"
                />
                <span className="text-xs text-gray-600">Se optimiza a máximo 1080px. Formatos: JPEG, PNG, WebP.</span>
              </label>

              {/* Botones de Acción */}
              <div className="flex gap-3 border-t border-border pt-5">
                <button type="submit" className="erp-btn-primary flex-1 justify-center">
                  {selectedPersona ? "Guardar Cambios" : "Crear Persona"}
                </button>
                <button type="button" onClick={closeModal} className="erp-btn-secondary">
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
