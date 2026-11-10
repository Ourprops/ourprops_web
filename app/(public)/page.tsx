import type { Metadata } from "next";

import { getFaqContent, getHomeContent } from "@/lib/content";
import Hero from "./_components/hero";
import ValueProposition from "./_components/value-proposition";
import HowItWorks from "./_components/how-it-works";
import Audience from "./_components/audience";
import Values from "./_components/values";
import Faq from "./_components/faq";
import GetStarted from "./_components/get-started";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// A short version of each part of the story, each linking on to its own page (/how-it-works, /who-its-for, /about,
// /faq), and one next step: register. Sections alternate between the page background, white, and deep blue.
export default async function Home() {
  const [content, faq] = await Promise.all([getHomeContent(), getFaqContent()]);

  return (
    <div className="pt-16">
      <Hero content={content.hero} />
      <ValueProposition content={content.valueProposition} />
      <HowItWorks content={content.howItWorks} />
      <Audience content={content.audience} />
      <Values content={content.values} showMore />
      <Faq content={faq} />
      <GetStarted content={content.getStarted} />
    </div>
  );
}
