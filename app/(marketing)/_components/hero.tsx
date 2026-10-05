import { FileText, Map, MapPin, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Hero() {
    return (
        <section className="w-full max-w-310 mx-auto px-4 md:px-8 pt-10 sm:pt-12 md:pt-16 pb-16 sm:pb-20 md:pb-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-16 items-center">
                <div className="lg:col-span-6 flex flex-col items-start space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-foreground">
                        <span className="inline-block w-2 h-2 rounded-full bg-secondary" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Secure, transparent property ownership
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground tracking-tight font-bold">
                        Secure land and property ownership in Ghana and West Africa.
                    </h1>

                    <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
                        OurProps helps owners, seekers, and agents prevent fraud,
                        reduce disputes, and manage property records with confidence.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto pt-2">
                        <Button
                            className="h-12 px-7 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm"
                            render={<a href="#waitlist" />}
                        >
                            Join the waitlist
                        </Button>
                        <Button
                            variant="outline"
                            className="h-12 px-6 rounded-lg bg-card text-primary hover:bg-muted shadow-sm"
                            render={<a href="#how-it-works" />}
                        >
                            See how it works
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-4">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted">
                              <span className="inline-flex items-center justify-center w-4 h-3 overflow-hidden rounded-xs shadow-sm">
                                <svg className="w-full h-full object-cover" viewBox="0 0 640 480">
                                    <path d="M0 0h640v160H0z" fill="#e71921" />
                                    <path d="M0 160h640v160H0z" fill="#ffd700" />
                                    <path d="M0 320h640v160H0z" fill="#006b3f" />
                                    <polygon
                                        fill="#000000"
                                        points="320,165 344,238 421,238 359,283 382,356 320,311 258,356 281,283 219,238 296,238"
                                    />
                                </svg>
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                                Launching in Ghana
                            </span>
                        </div>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-xs text-muted-foreground">
                            Built for trust, transparency, and reliability
                        </span>
                    </div>
                </div>

                <div className="lg:col-span-6 w-full">
                    <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6 md:p-7 flex flex-col gap-5 sm:gap-6">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                            <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base sm:text-lg text-foreground font-semibold">
                                        East Legon Residence
                                    </h3>
                                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground uppercase">
                                        Residential
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <MapPin size={16} className="text-muted-foreground" />
                                    East Legon, Accra, Greater Accra
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0 self-start sm:self-auto">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                <span className="text-xs font-semibold">Complete</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-muted">
                            <div>
                                <span className="block text-xs text-muted-foreground">Plot Area</span>
                                <span className="block text-sm font-semibold text-foreground mt-0.5">
                                    1,240 m²
                                </span>
                            </div>
                            <div>
                                <span className="block text-xs text-muted-foreground">Parcel ID</span>
                                <span className="block text-sm font-semibold text-foreground mt-0.5">
                                    GA-049-3821
                                </span>
                            </div>
                            <div>
                                <span className="block text-xs text-muted-foreground">Land Use</span>
                                <span className="block text-sm font-semibold text-foreground mt-0.5">
                                    Freehold Plan
                                </span>
                            </div>
                        </div>

                        <div className="relative w-full h-40 sm:h-44 rounded-lg bg-muted overflow-hidden">
                            <svg
                                className="w-full h-full text-border/70"
                                preserveAspectRatio="none"
                                viewBox="0 0 400 180"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <path
                                            d="M 40 0 L 0 0 0 40"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeDasharray="2,2"
                                            strokeWidth="0.75"
                                        />
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="#F4F6F8" />
                                <rect width="100%" height="100%" fill="url(#grid)" />
                                <path
                                    d="M -10,95 Q 120,80 220,110 T 420,90"
                                    fill="none"
                                    stroke="#D9E2EC"
                                    strokeLinecap="round"
                                    strokeWidth="14"
                                />
                                <path d="M 180,-10 L 195,190" fill="none" stroke="#D9E2EC" strokeWidth="10" />
                                <polygon fill="#E2E8F0" opacity="0.6" points="50,20 120,25 110,75 40,70" />
                                <polygon fill="#E2E8F0" opacity="0.6" points="130,25 210,30 200,80 125,75" />
                                <polygon fill="#E2E8F0" opacity="0.5" points="260,110 360,100 375,160 275,170" />
                                <polygon
                                    fill="rgba(254,106,52,0.12)"
                                    points="85,95 165,100 155,165 75,155"
                                    stroke="#fe6a34"
                                    strokeWidth="2"
                                />
                            </svg>

                            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 px-2 py-1 rounded bg-background/90 backdrop-blur-sm shadow-sm flex items-center gap-1.5 text-foreground">
                                <span className="w-2 h-2 rounded-sm bg-secondary" />
                                <span className="text-[10px] sm:text-xs font-medium">Cadastral boundary mapped</span>
                            </div>

                            <div className="absolute top-[68%] left-[28%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                                <MapPin size={22} className="text-secondary" />
                            </div>

                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-background/80 text-[10px] sm:text-[11px] font-mono text-muted-foreground max-w-[70%] truncate">
                                5°38&apos;42.8&quot;N 0°09&apos;14.1&quot;W
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                Associated Documentation
                            </span>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                                <div className="flex items-start sm:items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center text-primary shadow-xs">
                                        <FileText size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">Ownership record</p>
                                        <p className="text-xs text-muted-foreground wrap-break-word">Land deed documentation</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                    Complete
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                                <div className="flex items-start sm:items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center text-primary shadow-xs">
                                        <Map size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">Site plan</p>
                                        <p className="text-xs text-muted-foreground wrap-break-word">
                                            Surveyor certified coordinate sheet
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    In review
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                                <div className="flex items-start sm:items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center text-primary shadow-xs">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">Supporting clearance</p>
                                        <p className="text-xs text-muted-foreground wrap-break-word">
                                            Utility &amp; municipal confirmation
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                    Complete
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}