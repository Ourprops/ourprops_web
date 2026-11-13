// The one design every OurProps email uses. Supabase's email settings take a whole HTML file per email, with no
// shared parts, so each email is written out from this layout by `npm run emails:build` (scripts/build-emails.ts)
// into supabase/templates/, ready to paste.
//
// Email HTML is not web HTML: Gmail, Outlook and phone mail apps ignore <style> blocks, flexbox and most modern CSS.
// So it's a centred table with every style written inline, a button that is a padded link in a table cell (it still
// works where rounded corners don't), and no images the message depends on: the logo has a text name beside it.
//
// {{ .SiteURL }}, {{ .TokenHash }} and {{ .Email }} are Supabase's template variables, filled in when it sends.

export type EmailContent = {
    /** The subject line */
    subject: string
    /** The grey line many inboxes show after the subject; hidden in the email itself */
    preheader: string
    heading: string
    /** The message, one paragraph each. Plain text. */
    paragraphs: string[]
    button: { label: string; url: string }
    /** Smaller lines under the button, e.g. "If you didn't ask for this…" */
    notes: string[]
}

const COLOURS = {
    page: "#F4F6F8",
    card: "#FFFFFF",
    ink: "#0B1E33",
    text: "#3E4C59",
    muted: "#7B8794",
    border: "#E4E7EB",
    orange: "#FF6B35",
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

// Our own words only, but escaped all the same so a stray & or < can't break the email
function text(value: string) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// Links have & between their parts, which must be &amp; inside an href
function href(value: string) {
    return value.replace(/&/g, "&amp;")
}

export function renderEmail(email: EmailContent) {
    const paragraphs = email.paragraphs
        .map((paragraph) => `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${COLOURS.text};">${text(paragraph)}</p>`)
        .join("\n              ")

    const notes = email.notes
        .map((note) => `<p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: ${COLOURS.text};">${text(note)}</p>`)
        .join("\n              ")

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${text(email.subject)}</title>
</head>
<body style="margin: 0; padding: 0; background: ${COLOURS.page}; font-family: ${FONT};">
  <!-- preheader: the preview line in the inbox -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">${text(email.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${COLOURS.page};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px;">
          <!-- logo and name -->
          <tr>
            <td style="padding: 0 4px 20px;">
              <a href="{{ .SiteURL }}" style="text-decoration: none; color: ${COLOURS.ink};">
                <img src="{{ .SiteURL }}/logo.png" width="28" height="28" alt="" style="vertical-align: middle; border: 0;">
                <span style="vertical-align: middle; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: ${COLOURS.ink};">&nbsp;OurProps</span>
              </a>
            </td>
          </tr>
          <!-- the message -->
          <tr>
            <td style="background: ${COLOURS.card}; border: 1px solid ${COLOURS.border}; border-radius: 20px; padding: 36px 32px;">
              <div style="width: 40px; height: 4px; background: ${COLOURS.orange}; border-radius: 4px; margin: 0 0 20px;"></div>
              <h1 style="margin: 0 0 16px; font-size: 26px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; color: ${COLOURS.ink};">${text(email.heading)}</h1>
              ${paragraphs}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 24px;">
                <tr>
                  <td style="background: ${COLOURS.ink}; border-radius: 999px;">
                    <a href="${href(email.button.url)}" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 999px;">${text(email.button.label)}</a>
                  </td>
                </tr>
              </table>
              ${notes}
              <p style="margin: 20px 0 0; padding-top: 20px; border-top: 1px solid ${COLOURS.border}; font-size: 13px; line-height: 1.6; color: ${COLOURS.muted};">
                Button not working? Copy this link into your browser:<br>
                <a href="${href(email.button.url)}" style="color: ${COLOURS.ink}; word-break: break-all;">${href(email.button.url)}</a>
              </p>
            </td>
          </tr>
          <!-- footer: the same in every email -->
          <tr>
            <td style="padding: 24px 4px 0; font-size: 13px; line-height: 1.6; color: ${COLOURS.muted};">
              <p style="margin: 0 0 6px;">OurProps will never ask for your password or codes by phone, WhatsApp or email.</p>
              <p style="margin: 0;">OurProps &middot; Clear property records for Ghana &middot; <a href="{{ .SiteURL }}" style="color: ${COLOURS.muted};">Visit OurProps</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}
