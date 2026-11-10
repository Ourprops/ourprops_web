import type { HomeContent } from "@/lib/content/defaults"

import ProductDemo from "./product-demo"
import SectionHeading from "./section-heading"

// The product section of the landing page: its heading from Sanity, and a short walkthrough of what an owner does and
// gets, from pin to shared record. It replaced a still mock-up that showed document sharing, which OurProps doesn't do.
export default function ProductPreview({ content }: { content: HomeContent["productPreview"] }) {
	return (
		<section className="w-full bg-card py-20 md:py-28" id="product">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<SectionHeading align="center" {...content.header} />
				<div className="mt-14">
					<ProductDemo />
				</div>
			</div>
		</section>
	)
}
