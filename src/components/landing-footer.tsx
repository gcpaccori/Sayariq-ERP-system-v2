"use client";

import Link from "next/link";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a0f0d] text-gray-400 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Marca */}
          <div>
            <Link href="/" className="flex flex-col gap-2 mb-4">
              <span className="text-xl font-bold text-white">SAYARIQ®</span>
              <span className="text-xs text-gray-500">Agroexportación de Precisión</span>
            </Link>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="font-semibold text-white mb-4">Navegación</h3>
            <ul className="space-y-2">
              <li>
                <a href="#vision" className="hover:text-[#00C853] transition-colors">
                  Visión
                </a>
              </li>
              <li>
                <a href="#mision" className="hover:text-[#00C853] transition-colors">
                  Misión
                </a>
              </li>
              <li>
                <a href="#productos" className="hover:text-[#00C853] transition-colors">
                  Productos
                </a>
              </li>
              <li>
                <a href="#contacto" className="hover:text-[#00C853] transition-colors">
                  Contacto
                </a>
              </li>
            </ul>
          </div>

          {/* Portal */}
          <div>
            <h3 className="font-semibold text-white mb-4">Sistema</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="hover:text-[#00C853] transition-colors">
                  Portal B2B
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-[#00C853] transition-colors">
                  Documentación
                </a>
              </li>
            </ul>
          </div>

          {/* Ubicación */}
          <div>
            <h3 className="font-semibold text-white mb-4">Ubicación</h3>
            <p className="text-sm leading-relaxed">
              Pichanaki, Junín <br />
              Perú
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              © {currentYear} SAYARIQ. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-[#00C853] transition-colors">
                Privacidad
              </a>
              <a href="#" className="hover:text-[#00C853] transition-colors">
                Términos
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
