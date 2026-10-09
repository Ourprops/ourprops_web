import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toast"
import Providers from "@/components/providers"
import { getSiteContent } from "@/lib/content"
import { SITE_NAME, SITE_URL } from "@/lib/site"
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
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
      className={`${inter.variable} h-full antialiased`}
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
