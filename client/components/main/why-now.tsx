'use client';
import React, { useRef } from 'react';

import { motion, useInView } from 'framer-motion';
import { slideInFromLeft } from '@/utils/motion';
import { FaCheck } from 'react-icons/fa';

const features = [
  {
    name: "Don't Blink, You'll Miss It",
    description: "50x leverage, 24/7 hustle. Catch explosive gains before they vanish. Are you ready? Don't blink.",
  },
  {
    name: 'Explosive Growth Potential',
    description:
      'The crypto market is still young and volatile, offering the potential for massive gains for early adopters. The BTC ETF launch adds legitimacy and stability, fueling further growth.',
  },
  {
    name: 'Maximize Your Profits',
    description:
      'Leverage empowers you to control larger positions with less capital, multiplying your potential profits significantly.',
  },
  {
    name: 'Democratizing Finance',
    description:
      'Anyone, anywhere can participate in the crypto revolution, breaking down traditional financial barriers and empowering individuals.',
  },
  {
    name: 'Trade 24/7',
    description:
      'Automate your trading strategy and take the stress out of market analysis. Our bot works tirelessly for you, 24/7.',
  },
];

export const WhyNow = () => {
  const ref = useRef(null);
  const isInView = useInView(ref);

  return (
    <div
      className="mx-[-1.25rem] md:mx-[-2.5rem] lg:mx-[-5rem] px-5 md:px-10 lg:px-20 py-24 sm:py-32 bg-[#F2F2DF]"
      id="why-now"
      ref={ref}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          <div>
            <h2 className="w-full text-[40px] font-bold tracking-tight text-[#403E3B]">WHY NOW?</h2>
            <p className="mt-6 text-base leading-7 text-[#0D0D0D]">
              We're not just another high-leverage bot. We're your strategic weapon in this high-stakes game. Embrace
              the new age of trading with @flashx and maximize your profits. Here are just a few of many reasons{' '}
              <span className="text-sky-500"> why this is our time.</span>
            </p>
          </div>
          {isInView && (
            <motion.div initial="hidden" animate="visible" className="col-span-2">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-10 text-base leading-7 text-gray-600 sm:grid-cols-2 lg:gap-y-16">
                {features.map((feature, idx) => (
                  <motion.div variants={slideInFromLeft(0.5 + idx / 2)} key={feature.name} className="relative pl-9">
                    <dt className="font-semibold text-[#403E3B]">
                      <FaCheck className="absolute left-0 top-1 h-5 w-5 text-stone-500" aria-hidden="true" />
                      {feature.name}
                    </dt>
                    <dd className="mt-2 text-[#0D0D0D]">{feature.description}</dd>
                  </motion.div>
                ))}
              </dl>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
