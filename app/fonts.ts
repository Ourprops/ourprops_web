import { IBM_Plex_Mono, Inter } from "next/font/google";

// Inter for everything people read, as docs/design.md prefers: crisp and very readable on phones.
// Plex Mono for record data: references, coordinates, digital addresses, so they line up and read as data.
// Shared by the root layout and global-error, which replaces the layout and must load its own fonts.
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});
