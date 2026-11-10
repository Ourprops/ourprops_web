import type { HomeContent } from "@/lib/content/defaults"

import { DemoStage } from "./hero"
import SectionHeading from "./section-heading"

// The walkthrough of what an owner does and gets, from pin to shared record, on the same stage as the homepage's.
// Its heading from Sanity (Homepage → Product preview). Used on /how-it-works.
export default function ProductPreview({ content }: { content: HomeContent["productPreview"] }) {
	return (
		<section className="w-full pb-24 md:pb-36" id="walkthrough">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<SectionHeading align="center" {...content.header} />
			</div>
			<div className="mt-14 md:mt-20">
				<DemoStage />
			</div>
		</section>
	)
}
