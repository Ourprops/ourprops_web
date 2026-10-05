import Hero from "./_components/hero";
import About from "./_components/about";
import ValueProposition from "./_components/value-proposition";
import HowItWorks from "./_components/how-it-works";
import Audience from "./_components/audience";
import Values from "./_components/values";
import Waitlist from "./_components/waitlist";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="pt-20 md:pt-24">
        <Hero />
        <About />
        <ValueProposition />
        <HowItWorks />
        <Audience />
        <Values />
        <Waitlist />
      </main>
    </div>
  );
}
