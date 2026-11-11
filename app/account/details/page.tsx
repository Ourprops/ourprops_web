import { redirect } from "next/navigation"

// Your details moved into Settings; old links still work
export default function DetailsPage() {
    redirect("/account/settings")
}
