"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const galleryItems = [
  {
    image: "/docs/jengibre%20planta.jpg",
    title: "Jengibre en Planta",
    description: "Cultivo de jengibre en su entorno natural, raíces frescas listas para cosecha",
  },
  {
    image: "/docs/curcuma%20planta.jpg",
    title: "Cúrcuma en Planta",
    description: "Plantaciones de cúrcuma orgánica en Pichanaki, Junín",
  },
  {
    image: "/docs/jengibre.jpg",
    title: "Jengibre Fresco",
    description: "Raíces de jengibre 100% fresco post-cosecha, listos para exportación",
  },
  {
    image: "/docs/curcuma.jpg",
    title: "Cúrcuma Premium",
    description: "Producto final: cúrcuma con alta concentración de curcumina natural",
  },
  {
    image: "/docs/pesando%20el%20producto.jpeg",
    title: "Control de Calidad",
    description: "Proceso de pesaje y verificación del producto bajo estrictos estándares",
  },
  {
    image: "/docs/empresa%20faja%20de%20lavado.jpeg",
    title: "Equipamiento Moderno",
    description: "Faja de lavado automático para procesamiento higiénico del producto",
  },
  {
    image: "/docs/empresa%20trabajdoras%20escogiendo.jpeg",
    title: "Selección Manual",
    description: "Equipo especializado escogiendo y clasificando cada raíz manualmente",
  },
  {
    image: "/docs/persnal.jpg",
    title: "Nuestro Equipo",
    description: "Personal clave de Sayariq: excelencia en cada proceso",
  },
  {
    image: "/docs/producto.png",
    title: "Producto Empacado",
    description: "Jengibre y cúrcuma empacados listos para envío internacional",
  },
  {
    image: "/docs/logo1-Photoroom.png",
    title: "Identidad Sayariq",
    description: "Logo corporativo que representa precisión y agroexportación de calidad",
  },
];

export default function LandingGaleriaCompleta() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-[#00C853]" />
            <span className="text-sm font-semibold text-[#00C853] uppercase tracking-widest">
              Galería Completa
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0d2d22] leading-tight">
            Cada proceso, cada persona, cada momento.
          </h2>
          <p className="text-lg text-gray-600 mt-6 max-w-2xl">
            Conoce de cerca cómo opera Sayariq: desde la cosecha en campo hasta el control final de calidad. Transparencia total en cada etapa.
          </p>
        </div>

        {/* Galería Responsiva sin Overlay */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item, idx) => (
            <div
              key={idx}
              className={`group flex flex-col rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 transform ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${idx * 50}ms` }}
            >
              {/* Imagen sin overlay - Tamaño completo respetado */}
              <div className="relative w-full h-64 sm:h-72 lg:h-80 bg-gray-100 overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority={idx < 3}
                />
              </div>

              {/* Texto separado - Abajo, legible, sin achatar imagen */}
              <div className="p-5 sm:p-6 bg-gradient-to-br from-[#f9faf9] to-white border-b-2 border-[#00C853]">
                <h3 className="text-lg sm:text-xl font-bold text-[#0d2d22] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            ¿Listo para trabajar con Sayariq? Conoce nuestro proceso y confía en la calidad.
          </p>
          <a
            href="#contacto"
            className="inline-block bg-[#0d2d22] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#00C853] hover:text-[#0d2d22] transition-all"
          >
            Contáctanos Ahora
          </a>
        </div>
      </div>
    </section>
  );
}
