import { getVisitor } from "@/lib/auth/visitor";
import { getSiteContent } from "@/lib/content";
import { SanityLive } from "@/sanity/lib/live";
import Header from "./_components/header";
import Footer from "./_components/footer";
import RevealOnScroll from "./_components/reveal-on-scroll";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, visitor] = await Promise.all([getSiteContent(), getVisitor()]);

  return (
    <div className="min-h-full flex flex-col bg-card">
      <Header visitor={visitor} />
      {/* pt-16 clears the fixed header (h-16) for every page, so no page has to remember it */}
      <main className="flex-1 pt-16">{children}</main>
      <Footer
        footerTagline={site.footerTagline}
        footerNote={site.footerNote}
        companyName={site.companyName}
      />
      {/* boxes marked with reveal() float up as they scroll into view */}
      <RevealOnScroll />
      {/* Refreshes cached Sanity content when it's published */}
      <SanityLive />
    </div>
  );
}
