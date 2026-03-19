"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function LandingContactoForm() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    mensaje: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validación básica
    if (!formData.nombre.trim() || formData.nombre.length < 3) {
      toast.error("El nombre debe tener al menos 3 caracteres.");
      return;
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Ingresa un email válido.");
      return;
    }

    if (!formData.mensaje.trim() || formData.mensaje.length < 10) {
      toast.error("El mensaje debe tener al menos 10 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      // Simulación: guardar en console (preparado para conectar a API/Supabase después)
      console.log("📧 Nuevo contacto:", formData);

      // Toast de éxito
      toast.success("¡Mensaje enviado! Nos contactaremos pronto.");

      // Limpiar formulario
      setFormData({
        nombre: "",
        email: "",
        telefono: "",
        mensaje: "",
      });
    } catch (error) {
      toast.error("Hubo un error. Intenta de nuevo.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      id="contacto"
      className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0d2d22] to-[#0a1f1a] text-white"
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-[#00C853]" />
            <span className="text-sm font-semibold text-[#00C853] uppercase tracking-widest">
              Contacto
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            ¿Listo para trabajar juntos?
          </h2>
          <p className="text-lg text-gray-300">
            Cuéntanos sobre tu proyecto. Nos contactaremos en menos de 24 horas.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Tu nombre"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-[#00C853] transition-colors"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Email Corporativo *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="correo@empresa.com"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-[#00C853] transition-colors"
              required
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Teléfono (opcional)
            </label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="+51 9 XXXX XXXX"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-[#00C853] transition-colors"
            />
          </div>

          {/* Mensaje */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Mensaje *
            </label>
            <textarea
              name="mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              placeholder="Cuéntanos sobre tu interés..."
              rows={5}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-[#00C853] transition-colors resize-none"
              required
            />
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[#00C853] text-[#0d2d22] font-bold rounded-lg hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Enviando..." : "Enviar Mensaje"}
          </button>
        </form>

        {/* Contacto directo */}
        <div className="mt-12 pt-12 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-gray-400 mb-2">Email</p>
            <a
              href="mailto:contacto@sayariq.com"
              className="text-lg font-semibold hover:text-[#00C853] transition-colors"
            >
              contacto@sayariq.com
            </a>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Teléfono</p>
            <a
              href="tel:+51944456789"
              className="text-lg font-semibold hover:text-[#00C853] transition-colors"
            >
              +51 (44) 456-789
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
