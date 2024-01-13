import { Card } from '@/components/sub/card';
import React from 'react';

const guides = [
  {
    id: 1,
    src: '/images/logo-2.jpeg',
    title: 'What is FlashX?',
    description:
      'Want to supercharge your crypto journey? Flashx throws open the doors to explosive profits (and potential losses) with its high-octane leverage engine. Buckle up and take a peek under the hood.',
    link: 'https://mirror.xyz/0x19d7D363B2381E53FD171eb74073D560C7Bd319E/POww5yDrI4JrEhh5lS9Y021EIM9pZQWdjZobEo19vr4',
  },
  {
    id: 2,
    src: '/images/guide-2.jpeg',
    title: 'How to use FlashX to maximize your crypto earnings?',
    description:
      'Unravelling the intricate strategies that can propel your earnings, ensuring you navigate the crypto market with confidence and competence.',
    link: 'https://mirror.xyz/0x19d7D363B2381E53FD171eb74073D560C7Bd319E/flmV8_Zmmup3IusuwWeNqAlAxPODg0Pw1c-sUN2gnBY',
  },
];

export const Guide = () => {
  return (
    <div className="flex flex-col items-center justify-center" id="guide">
      <h1 className="text-4xl font-semibold text-gray-200">GUIDES</h1>
      <div className="mt-16 sm:mt-20 lg:mt-24 h-full w-fit grid grid-cols-1 md:grid-cols-2 gap-10">
        {guides.map(guide => (
          <Card key={guide.id} src={guide.src} title={guide.title} description={guide.description} link={guide.link} />
        ))}
      </div>
    </div>
  );
};
