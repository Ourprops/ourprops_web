import { getSiteContent } from "@/lib/content";
import { SanityLive } from "@/sanity/lib/live";
import Header from "./_components/header";
import Footer from "./_components/footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getSiteContent();

  return (
    <div className="min-h-full flex flex-col">
      <Header navigation={site.navigation} cta={site.headerCta} />
      <main className="flex-1">{children}</main>
      <Footer
        footerTagline={site.footerTagline}
        footerLinks={site.footerLinks}
        footerNote={site.footerNote}
        companyName={site.companyName}
      />
      {/* Refreshes cached Sanity content when it's published */}
      <SanityLive />
    </div>
  );
}
