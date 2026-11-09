"use client"

import { Check, Link2, MessageCircle } from "lucide-react"
import { useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Sharing a verified property's public record: straight to WhatsApp, or a copied link for anywhere else
export function ShareRecord({ path, name, className }: { path: string; name: string; className?: string }) {
    const [copied, setCopied] = useState(false)

    function url() {
        return new URL(path, window.location.origin).toString()
    }

    async function copy() {
        try {
            await navigator.clipboard.writeText(url())
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        } catch {
            // Clipboard refused (an old browser, or no permission): show the link so it can be copied by hand
            window.prompt("Copy this link", url())
        }
    }

    return (
        <div className={cn("flex flex-wrap gap-2", className)}>
            <a
                href={`https://wa.me/?text=${encodeURIComponent(`${name} is verified on OurProps: `)}`}
                onClick={(event) => {
                    // The link is only known in the browser, so the message is finished here
                    event.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(`${name} is verified on OurProps: ${url()}`)}`
                }}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", className: "h-10" })}
            >
                <MessageCircle aria-hidden /> Share on WhatsApp
            </a>
            <Button type="button" variant="outline" className="h-10" onClick={copy}>
                {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
                {copied ? "Link copied" : "Copy link"}
            </Button>
        </div>
    )
}
