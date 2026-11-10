import type { FaqContent } from "@/lib/content/defaults"
import MoreLink from "./more-link"
import SectionHeading from "./section-heading"

// How many questions the homepage shows; Studio says "the first three also show on the homepage"
export const HOME_FAQ_COUNT = 3

type FaqProps = {
	content: FaqContent
	/** "home": the first three and a link to /faq. "page": opens /faq with every question */
	variant?: "home" | "page"
}

export default function Faq({ content, variant = "home" }: FaqProps) {
	const page = variant === "page"
	const items = page ? content.items : content.items.slice(0, HOME_FAQ_COUNT)

	return (
		<section className="w-full bg-card py-20 md:py-28" id="faq">
			<div className="mx-auto grid max-w-310 grid-cols-1 gap-12 px-5 md:px-8 lg:grid-cols-12 lg:gap-16">
				<div className="lg:col-span-5">
					<SectionHeading as={page ? "h1" : "h2"} {...content.header} />
					{page ? null : <MoreLink href="/faq" className="mt-6">All questions</MoreLink>}
				</div>

				<div className="divide-y divide-border border-y border-border lg:col-span-7">
					{items.map(({ question, answer }) => (
						<details key={question} className="group py-5">
							<summary className="cursor-pointer list-none text-base font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
								<span className="flex items-start justify-between gap-4">
									{question}
									<span aria-hidden className="mt-0.5 text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45">
										+
									</span>
								</span>
							</summary>
							<p className="mt-3 text-base leading-relaxed whitespace-pre-line text-copy">{answer}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	)
}

/** schema.org FAQPage for /faq, so search engines can show the answers. Only the visible questions and answers. */
export function faqJsonLd(content: FaqContent) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: content.items.map(({ question, answer }) => ({
			"@type": "Question",
			name: question,
			acceptedAnswer: { "@type": "Answer", text: answer },
		})),
	}
}

/** JSON for a <script> tag: "<" escaped, so text from Sanity can't close the tag early */
export function toScriptJson(value: unknown) {
	return JSON.stringify(value).replace(/</g, "\\u003c")
}
