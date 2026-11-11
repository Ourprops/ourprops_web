import type { Metadata } from "next";

import { getFaqContent, getHomeContent } from "@/lib/content";
import Hero from "./_components/hero";
import ValueProposition from "./_components/value-proposition";
import HowItWorks from "./_components/how-it-works";
import Audience from "./_components/audience";
import Values from "./_components/values";
import Technology from "./_components/technology";
import Faq from "./_components/faq";
import GetStarted from "./_components/get-started";
import BlogSection from "./_components/blog-section";
import { HOME_POST_COUNT, getPosts } from "@/lib/content/blog";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// The product on stage first (in the hero), then a short version of each part of the story, each linking on to its own page (/how-it-works, /who-its-for, /about,
// /faq), and one next step: register. Sections alternate between the page background, white, and deep blue.
export default async function Home() {
  const [content, faq, posts] = await Promise.all([getHomeContent(), getFaqContent(), getPosts(HOME_POST_COUNT)]);

  return (
    <div>
      <Hero content={content.hero} />
      <ValueProposition content={content.valueProposition} />
      <Technology />
      <HowItWorks content={content.howItWorks} />
      <Audience content={content.audience} />
      <Values content={content.values} showMore />
      <Faq content={faq} />
      {/* the newest posts; nothing until the first one is published */}
      <BlogSection posts={posts} />
      <GetStarted content={content.getStarted} />
    </div>
  );
}
