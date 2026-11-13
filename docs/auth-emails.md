# Auth emails

How OurProps's emails are designed and built, how "Forgot password?" works, and what to set up in Supabase.

## One design for every email

Supabase takes a whole HTML file per email, with no shared parts, so the design lives in code and each email is built from it:

| File | What it is |
|---|---|
| `emails/layout.ts` | The design: OurProps name and logo, an orange accent, a heading, the message, one ink button, a "button not working?" link, and the same footer on every email. Built from tables with inline styles, which is what Gmail, Outlook and phone mail apps understand. |
| `emails/templates.ts` | The words of each email: subject, preview line, heading, paragraphs, button, notes. |
| `supabase/templates/<name>.html` | The finished emails, to paste into Supabase. **Don't edit these by hand**: a test fails if they don't match the templates. |

**To change an email or add one:** edit `emails/templates.ts`, then run `npm run emails:build`. It rewrites `supabase/templates/`. Then paste the changed file into Supabase (below), and keep the subject in `supabase/config.toml` the same as in the template.

**Links** go to `/api/auth/confirm` with Supabase's one-time token (`{{ .TokenHash }}`), so they work on any device. Their `next` page must be one `lib/auth/email-links.ts` allows.

| Email | Supabase name | File | Link goes to |
|---|---|---|---|
| Reset your password | Reset Password | `recovery.html` | `/account/reset-password` |
| Confirm your email | Confirm signup | `confirmation.html` | `/account/onboarding` |

**Confirm signup is only sent if Supabase's "Confirm email" setting is on.** It's off locally (`enable_confirmations = false`), so people sign up and go straight in. Turning it on is a product decision: it stops fake or mistyped emails, but adds a step before someone can start. If you turn it on, the sign-up form already shows "Check your email".

## Password reset: the flow

1. **`/account/forgot-password`.** The person enters their email, and we call `resetPasswordForEmail`. The page always says "If there's an OurProps account for this email, we've sent a link", so it can't be used to find out who has an account.
2. **The email** links to `/api/auth/confirm?token_hash=…&type=recovery&next=/account/reset-password` (template: `supabase/templates/recovery.html`).
3. **`/api/auth/confirm`** checks the link once (`verifyOtp`), which signs the person in, and sends them to `/account/reset-password`.
   - **An expired or used link** goes back to `/account/forgot-password?expired=1`, with a message asking them to request a new one.
   - **Nothing from the link is logged.**
4. **`/account/reset-password`.** The person types the new password twice (same rules as sign-up), and we call `updateUser`. Then:
   - every other device is signed out (`signOut({ scope: "others" })`);
   - they land on their dashboard, signed in.
5. **Accounts with an authenticator app** (admins) are sent to `/account/security` to enter their code first, because Supabase only lets a fully signed-in session change the password. The page then brings them back to the reset page.

**Why a token hash, not Supabase's default link:** the default link only works in the same browser that asked for the reset. People often ask on a laptop and open the email on their phone. The confirm route still accepts the default link (`?code=…`) as a fallback.

## Local (your computer)

- Emails go to Supabase's test inbox: **http://localhost:54324** (Mailpit). Nothing is really sent.
- `supabase/config.toml` sets the site address to `http://localhost:3000` and uses our reset template. **These take effect after Supabase restarts** (`supabase stop && supabase start`). Until then, the running instance uses its old settings, and reset links point at `127.0.0.1:3000` with Supabase's default template.

## Hosted Supabase (before launch)

In the Supabase dashboard for the production project:

1. **Authentication → URL Configuration**
   - **Site URL:** the live address, e.g. `https://ourprops.com`.
   - **Redirect URLs:** add `https://ourprops.com/**`. Add Vercel preview addresses too if you test resets there.
2. **Authentication → Emails**, for each email in the table above:
   - **Reset Password:** subject `Reset your OurProps password`; body: paste all of `supabase/templates/recovery.html`.
   - **Confirm signup:** subject `Confirm your email for OurProps`; body: paste all of `supabase/templates/confirmation.html`.
   - The logo in the emails loads from `<Site URL>/logo.png`, so set the Site URL (step 1) first.
3. **Sending real emails.** Supabase's built-in email service only sends a few emails an hour, and only to your team's addresses. For real users, set up custom SMTP (**Authentication → Emails → SMTP Settings**) with an email provider. This hasn't been chosen yet; Resend, Brevo and Postmark all work. It also unblocks email notifications.
4. **Rate limits** (Authentication → Rate Limits). The default number of reset emails per hour is fine to start with.

## Checking it works

1. On `/account/login`, type an email and tap "Forgot password?". The email carries over.
2. Send the link, open the email (Mailpit locally) and tap the button.
3. Set a new password. You should land on the dashboard, signed in.
4. Opening the same link again should land on "Reset your password" with the expired message.
