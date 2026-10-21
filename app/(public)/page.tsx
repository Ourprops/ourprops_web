import type { Metadata } from "next";

import { getHomeContent } from "@/lib/content";
import Hero from "./_components/hero";
import ValueProposition from "./_components/value-proposition";
import HowItWorks from "./_components/how-it-works";
import ProductPreview from "./_components/product-preview";
import Audience from "./_components/audience";
import Values from "./_components/values";
import About from "./_components/about";
import Waitlist from "./_components/waitlist";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Sections alternate between the page background and white cards
export default async function Home() {
  const content = await getHomeContent();

  return (
    <div className="pt-20 md:pt-24">
      <Hero content={content.hero} />
      <ValueProposition content={content.valueProposition} />
      <HowItWorks content={content.howItWorks} />
      <ProductPreview content={content.productPreview} />
      <Audience content={content.audience} />
      <Values content={content.values} />
      <About content={content.about} />
      <Waitlist content={content.waitlist} />
    </div>
  );
}
