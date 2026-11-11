import { getVisitor } from "@/lib/auth/visitor";
import { getSiteContent } from "@/lib/content";
import { SanityLive } from "@/sanity/lib/live";
import Header from "./_components/header";
import Footer from "./_components/footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, visitor] = await Promise.all([getSiteContent(), getVisitor()]);

  return (
    <div className="min-h-full flex flex-col bg-card">
      <Header visitor={visitor} />
      <main className="flex-1">{children}</main>
      <Footer
        footerTagline={site.footerTagline}
        footerNote={site.footerNote}
        companyName={site.companyName}
      />
      {/* Refreshes cached Sanity content when it's published */}
      <SanityLive />
    </div>
  );
}
