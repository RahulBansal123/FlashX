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
      <div className="hidden sm:block md:hidden lg:hidden xl:hidden bg-white rounded-full text-base fixed bottom-10 right-5 p-1">
        sm
      </div>
      <div className="hidden sm:hidden md:block lg:hidden xl:hidden bg-white rounded-full text-base fixed bottom-10 right-5 p-1">
        md
      </div>
      <div className="hidden sm:hidden md:hidden lg:block xl:hidden bg-white rounded-full text-base fixed bottom-10 right-5 p-1">
        lg
      </div>
      <div className="hidden sm:hidden md:hidden lg:hidden xl:block bg-white rounded-full text-base fixed bottom-10 right-5 p-1">
        xl
      </div>
    </main>
  );
}
