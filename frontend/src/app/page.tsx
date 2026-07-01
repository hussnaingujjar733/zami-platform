import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { Timeline } from "../components/Timeline";
import { Features } from "../components/Features";
import { HouseExperience } from "../components/HouseExperience";
import { CTA } from "../components/CTA";
import { Footer } from "../components/Footer";
import { NoiseLayer } from "../components/effects/NoiseLayer";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <NoiseLayer />
      <Navbar />
      <Hero />
      <Timeline />
      <Features />
      <HouseExperience />
      <CTA />
      <Footer />
    </main>
  );
}
