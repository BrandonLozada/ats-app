import type { Metadata } from "next";

import HeroSection from "@/components/sections/hero-section";

export const metadata: Metadata = {
  title: "Bolsa de trabajo",
  description:
    "Explora vacantes disponibles, crea tu perfil profesional y postúlate en línea dentro de nuestra organización.",
};

export default function Home() {
  return (
    <main>
      <HeroSection />
    </main>
  );
}
