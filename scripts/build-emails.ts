// Writes every email in emails/templates.ts, in the layout from emails/layout.ts, to supabase/templates/<name>.html.
// Run: npm run emails:build. Then paste each file into Supabase (docs/auth-emails.md). A test fails if the files and
// the templates disagree, so edit the templates, not the HTML.
import { writeFileSync } from "node:fs"
import { join } from "node:path"

import { renderEmail } from "../emails/layout"
import { EMAILS } from "../emails/templates"

for (const [name, email] of Object.entries(EMAILS)) {
    const path = join("supabase", "templates", `${name}.html`)
    writeFileSync(path, renderEmail(email))
    console.log(`${path}  (subject: ${email.subject})`)
}
