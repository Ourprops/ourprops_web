import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

import { SHARE_TITLE } from "@/lib/site"

// Default link preview image, served at /share-image.png and rendered once at build time.
// Used until a "Social share image" is uploaded in Sanity's Site settings.
export const dynamic = "force-static"

const size = { width: 1200, height: 630 }

const COLORS = {
    blue: "#003366",
    orange: "#FF6B35",
    text: "#102A43",
    copy: "#52606D",
    border: "#D9E2EC",
    page: "#F7F9FB",
    map: "#EEF2F6",
    plot: "#E1E7EF",
    success: "#2E7D5B",
    successSoft: "#E6F2EC",
    warning: "#B7791F",
    warningSoft: "#FBF1E1",
}

function StatusPill({ label, color, background }: { label: string; color: string; background: string }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 999,
                background,
                color,
                fontSize: 16,
                fontWeight: 500,
            }}
        >
            <div style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
            {label}
        </div>
    )
}

function DocumentRow({ name, detail, status }: { name: string; detail: string; status: React.ReactNode }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 0",
                borderTop: `1px solid ${COLORS.border}`,
            }}
        >
            <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 19, fontWeight: 500, color: COLORS.text }}>{name}</div>
                <div style={{ fontSize: 15, color: COLORS.copy, marginTop: 2 }}>{detail}</div>
            </div>
            {status}
        </div>
    )
}

export async function GET() {
    const [interMedium, interBold, logo] = await Promise.all([
        readFile(join(process.cwd(), "assets/fonts/Inter-500.ttf")),
        readFile(join(process.cwd(), "assets/fonts/Inter-700.ttf")),
        readFile(join(process.cwd(), "public/logo.svg"), "base64"),
    ])

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    background: COLORS.blue,
                    fontFamily: "Inter",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Left: brand and headline */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        width: 620,
                        padding: "64px 0 64px 72px",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
                        <img src={`data:image/svg+xml;base64,${logo}`} width={36} height={48} alt="" />
                        <div style={{ fontSize: 34, fontWeight: 700, color: "white", letterSpacing: -0.5 }}>
                            OurProps
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div
                            style={{
                                fontSize: 68,
                                fontWeight: 700,
                                color: "white",
                                lineHeight: 1.04,
                                letterSpacing: -2.4,
                            }}
                        >
                            {SHARE_TITLE}
                        </div>
                        <div
                            style={{
                                fontSize: 26,
                                fontWeight: 500,
                                color: "rgba(255,255,255,0.75)",
                                lineHeight: 1.4,
                                marginTop: 24,
                                maxWidth: 500,
                            }}
                        >
                            Property details, documents, and mapped boundaries in one clear record.
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignSelf: "flex-start",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 18px",
                            borderRadius: 999,
                            background: COLORS.orange,
                            color: "white",
                            fontSize: 20,
                            fontWeight: 700,
                        }}
                    >
                        Launching in Ghana
                    </div>
                </div>

                {/* Right: a simplified property record */}
                <div
                    style={{
                        position: "absolute",
                        right: 64,
                        top: 72,
                        width: 460,
                        display: "flex",
                        flexDirection: "column",
                        background: "white",
                        borderRadius: 28,
                        padding: 28,
                        boxShadow: "0 40px 80px rgba(0,0,0,0.35)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.text, letterSpacing: -0.5 }}>
                                East Legon Residence
                            </div>
                            <div style={{ fontSize: 17, color: COLORS.copy, marginTop: 4 }}>East Legon, Accra</div>
                        </div>
                        <StatusPill label="In review" color={COLORS.warning} background={COLORS.warningSoft} />
                    </div>

                    <div
                        style={{
                            display: "flex",
                            marginTop: 22,
                            height: 190,
                            borderRadius: 16,
                            background: COLORS.map,
                            border: `1px solid ${COLORS.border}`,
                            overflow: "hidden",
                        }}
                    >
                        <svg width="404" height="190" viewBox="0 0 404 190">
                            <g fill={COLORS.plot}>
                                <path d="M18 -10h88l-4 52H14z" />
                                <path d="M122 -10h94l-4 50H118z" />
                                <path d="M266 -10h70l2 48h-74z" />
                                <path d="M350 -10h60v46h-60z" />
                                <path d="M12 86h64l-4 72H8z" />
                                <path d="M272 82h66l-4 76h-64z" />
                                <path d="M350 86h60v70h-60z" />
                            </g>
                            <path d="M-20 62C80 50 160 72 246 60S370 46 424 56" stroke="white" strokeWidth="16" fill="none" />
                            <path d="M248 -20 254 210" stroke="white" strokeWidth="12" fill="none" />
                            <path d="M-20 174C70 170 150 178 250 172" stroke="white" strokeWidth="8" fill="none" />
                            <path
                                d="M98 86l118 6-8 70-114-6z"
                                fill="rgba(255,107,53,0.16)"
                                stroke={COLORS.orange}
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            <g fill="white" stroke={COLORS.orange} strokeWidth="2.5">
                                <circle cx="98" cy="86" r="5" />
                                <circle cx="216" cy="92" r="5" />
                                <circle cx="208" cy="162" r="5" />
                                <circle cx="94" cy="156" r="5" />
                            </g>
                        </svg>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
                        <DocumentRow
                            name="Ownership document"
                            detail="Land deed"
                            status={<StatusPill label="Complete" color={COLORS.success} background={COLORS.successSoft} />}
                        />
                        <DocumentRow
                            name="Site plan"
                            detail="Surveyor coordinate sheet"
                            status={<StatusPill label="In review" color={COLORS.warning} background={COLORS.warningSoft} />}
                        />
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                { name: "Inter", data: interMedium, style: "normal", weight: 500 },
                { name: "Inter", data: interBold, style: "normal", weight: 700 },
            ],
        }
    )
}
