import { socials } from '@/constants';
import Image from 'next/image';
import React from 'react';

export const Navbar = () => {
  return (
    <div className="w-full h-[65px] fixed top-0 shadow-lg shadow-[#313030]/50 bg-[#313030]/20 backdrop-blur-md z-50 px-20">
      <div className="w-full h-full flex flex-row items-center justify-between m-auto px-[10px]">
        <a href="/" className="h-auto w-auto flex flex-row items-center">
          <Image
            src="/images/logo.png"
            alt="logo"
            width={20}
            height={25}
            className="cursor-pointer hover:animate-slowspin"
          />

          <span className="font-bold hidden ml-1 md:block text-gray-300">FlashX</span>
        </a>

        <div className="w-[500px] h-full flex flex-row items-center justify-between md:mr-20">
          <div className="flex items-center justify-between w-full h-auto border border-[#575750] bg-[#313030]/20 mr-[15px] px-[20px] py-[10px] rounded-full text-gray-200">
            <a href="#features" className="cursor-pointer">
              Features
            </a>
            <a href="#why-now" className="cursor-pointer">
              Why now
            </a>
            <a href="#guide" className="cursor-pointer">
              Guides
            </a>
          </div>
        </div>

        <div className="flex items-center gap-x-5">
          {socials.map(social => (
            <a href={social.link} key={social.name} target="_blank">
              <social.icon className="text-2xl text-gray-300 hover:text-gray-400 cursor-pointer" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
