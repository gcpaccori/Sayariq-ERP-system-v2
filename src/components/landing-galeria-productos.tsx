"use client";

import Image from "next/image";

const products = [
  {
    name: "Jengibre Fresco",
    scientific: "Zingiber officinale",
    description:
      "Rizomas de alta densidad, lavados y secados al aire en menos de 12 horas post-cosecha. Aroma penetrante, sabor fresco.",
    image: "/docs/jengibre.jpg",
    badge: "Premium",
  },
  {
    name: "Cúrcuma Fresca",
    scientific: "Curcuma longa",
    description:
      "Cosecha vibrante con alta concentración de curcumina natural. Directo de nuestras tierras fértiles a los mercados más exigentes.",
    image: "/docs/curcuma.jpg",
    badge: "Orgánica",
  },
];

export default function LandingGaleriaProductos() {
  return (
    <section
      id="productos"
      className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#f9faf9] to-white"
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-[#00C853]" />
            <span className="text-sm font-semibold text-[#00C853] uppercase tracking-widest">
              Nuestras Raíces
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0d2d22] leading-tight">
            Dos productos. <br /> Una promesa: fresco.
          </h2>
        </div>

        {/* Galería */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {products.map((product, idx) => (
            <div
              key={idx}
              className="group relative rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300"
            >
              {/* Imagen */}
              <div className="relative h-96 sm:h-[500px] lg:h-[550px]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Overlay Texto */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-8 text-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#00C853] uppercase tracking-widest mb-2">
                      {product.scientific}
                    </p>
                    <h3 className="text-3xl sm:text-4xl font-bold mb-3">
                      {product.name}
                    </h3>
                  </div>
                  <span className="bg-[#00C853] text-[#0d2d22] px-4 py-2 rounded-full text-xs font-bold uppercase whitespace-nowrap ml-4">
                    {product.badge}
                  </span>
                </div>
                <p className="text-gray-200 leading-relaxed text-sm sm:text-base">
                  {product.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl sm:text-5xl font-bold text-[#00C853] mb-2">
              10T
            </div>
            <p className="text-gray-600 font-medium">Semanales</p>
          </div>
          <div className="text-center">
            <div className="text-4xl sm:text-5xl font-bold text-[#00C853] mb-2">
              0%
            </div>
            <p className="text-gray-600 font-medium">Congelados</p>
          </div>
          <div className="text-center">
            <div className="text-4xl sm:text-5xl font-bold text-[#00C853] mb-2">
              100%
            </div>
            <p className="text-gray-600 font-medium">Fresco</p>
          </div>
        </div>
      </div>
    </section>
  );
}
