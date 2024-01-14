import { Hero } from '@/components/main/hero';
import { Guide } from '@/components/main/guide';
import { Features } from '@/components/main/features';
import { WhyNow } from '@/components/main/why-now';

export default function Home() {
  return (
    <main className="relative h-full w-full flex flex-col gap-y-10 px-5 md:px-10 lg:px-20">
      <Hero />
      <Features />
      <WhyNow />
      <div className="my-48 cursive text-3xl font-medium text-center text-gray-300">
        Stop missing out. Join the future of crypto trading.
      </div>
      <Guide />
    </main>
  );
}
