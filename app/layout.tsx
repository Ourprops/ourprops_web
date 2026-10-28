import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"
import Providers from "@/components/providers"
import { getSiteContent } from "@/lib/content"
import { SITE_NAME, SITE_URL } from "@/lib/site"
import "./globals.css";

// Plex reads like technical documentation, which suits property records.
// The mono face is for record data: parcel IDs, coordinates, digital addresses.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

// Site-wide SEO and link previews, editable in Sanity under Site settings
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteContent()

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: site.title,
      template: `%s · ${SITE_NAME}`,
    },
    description: site.description,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_GH",
      title: site.shareTitle,
      description: site.shareDescription,
      images: [site.shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title: site.shareTitle,
      description: site.shareDescription,
      images: [site.shareImage],
    },
  }
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          {children}
        </Providers>
        <Toaster />
        </body>
    </html>
  );
}
