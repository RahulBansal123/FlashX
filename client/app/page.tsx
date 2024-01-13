import { Hero } from '@/components/main/hero';
import { Guide } from '@/components/main/guide';
import { Features } from '@/components/main/features';
import { WhyNow } from '@/components/main/why-now';

export default function Home() {
  return (
    <main className="h-full w-full">
      <div className="flex flex-col gap-x-20 gap-y-10">
        <Hero />
        <Features />
        <WhyNow />
        <div className="my-48 cursive text-3xl font-medium text-center text-gray-300">
          Stop missing out. Join the future of crypto trading.
        </div>
        <Guide />
      </div>
    </main>
  );
}
