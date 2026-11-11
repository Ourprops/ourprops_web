// How owners reach a person at OurProps. WhatsApp, because it's how most Ghanaians, at home and abroad, already reach a
// business.
//
// PLACEHOLDER: the number isn't decided yet. Replace it here, in international format without + or spaces
// (233 then the number without its leading 0), and every Help link in the app follows.
export const SUPPORT_WHATSAPP_NUMBER = "233000000000"

export const SUPPORT_WHATSAPP_IS_PLACEHOLDER = SUPPORT_WHATSAPP_NUMBER === "233000000000"

/** A WhatsApp chat with OurProps, optionally with the first message written for the owner */
export function supportWhatsAppUrl(message?: string) {
    const url = new URL(`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`)
    if (message) url.searchParams.set("text", message)
    return url.toString()
}
