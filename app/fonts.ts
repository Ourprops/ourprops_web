import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

// Plex reads like technical documentation, which suits property records.
// The mono face is for record data: parcel IDs, coordinates, digital addresses.
// Shared by the root layout and global-error, which replaces the layout and must load its own fonts.
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-sans",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});
