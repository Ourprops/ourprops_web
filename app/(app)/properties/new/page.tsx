"use client"
import { useNewPropertyStore } from "@/stores/new-property-store"
import StartScreen from "./_components/start-screen"


export default function NewPropertyPage() {
    const screen = useNewPropertyStore((state) => state.screen)

    return (
        <main className="flex-1">
            {screen === "start" && <StartScreen />}
        </main>
    )
}