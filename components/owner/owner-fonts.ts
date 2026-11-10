import { Inter } from "next/font/google"

// Inter, as docs/design.md prefers: crisp and very readable on phones. Used by the owner area (OwnerShell) while its
// redesign is reviewed; the rest of the site keeps Plex until then.
export const ownerInter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-owner-inter",
})
