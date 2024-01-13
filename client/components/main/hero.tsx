'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { slideInFromLeft, slideInFromRight, slideInFromTop } from '@/utils/motion';
import Image from 'next/image';

export const Hero = () => {
  return (
    <div className="relative flex flex-col h-full w-full">
      <motion.div
        initial="hidden"
        animate="visible"
        className="flex flex-row items-center justify-center px-20 mt-32 w-full z-[20]"
      >
        <div className="h-full w-full flex flex-col gap-5 justify-center m-auto text-start">
          <motion.div
            variants={slideInFromTop}
            className="welcome-box py-[8px] px-[7px] border border-[#747468] opacity-[0.9]"
          >
            <span className="mr-1">
              <Image src="/images/stars.gif" alt="stars" width={28} height={28} />
            </span>
            <h1 className="welcome-text bg-gradient-to-r from-[#8C8B79] via-[#e8e8d6] to-[#8C8B79] text-[13px]">
              {' '}
              Sleep. Trade. Profit. Repeat.
            </h1>
          </motion.div>

          <motion.div
            variants={slideInFromLeft(0.5)}
            className="flex flex-col gap-6 mt-6 text-6xl font-bold text-white max-w-[600px] w-auto h-auto"
          >
            <span>
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#F2F2DF] to-[#727365]">
                Level Up{' '}
              </span>
              Your Crypto Game
            </span>
          </motion.div>

          <motion.p variants={slideInFromLeft(0.8)} className="text-lg text-gray-400 my-5 max-w-[600px]">
            Trade BTC, ETH, DOGE and other top crypto with up to 50x leverage at lightning speed.
          </motion.p>
          <motion.a
            variants={slideInFromLeft(1)}
            className="py-2 button-primary text-center text-white cursor-pointer rounded-lg max-w-[200px]"
            href="https://t.me/leveluptrading"
          >
            Start Trading
          </motion.a>
        </div>

        <motion.div
          variants={slideInFromRight(0.8)}
          className="w-full h-full hidden md:flex justify-center items-center"
        >
          <Image src="/images/chart-1.png" alt="work icons" height={650} width={650} />
        </motion.div>
      </motion.div>
    </div>
  );
};
