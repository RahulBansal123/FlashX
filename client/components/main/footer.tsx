import React from 'react';
import { socials } from '@/constants';

export const Footer = () => {
  return (
    <div className="mt-40 w-full h-full bg-transparent text-gray-200 shadow-lg p-[15px]">
      <div className="w-full flex flex-col items-center justify-center m-auto">
        <div className="w-full h-full flex items-start justify-around flex-wrap">
          <div className="min-w-[200px] h-auto flex flex-col items-center justify-start">
            <div className="font-bold text-[16px]">Community</div>

            <div className="mt-10 flex flex-col space-y-6 items-center">
              {socials.map(social => (
                <a href={social.link} key={social.name} target="_blank" className="cursor-pointer flex items-center">
                  <social.icon className="text-lg text-gray-300 hover:text-gray-400" />
                  <span className="text-[15px] ml-2">{social.name}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="min-w-[200px] h-auto flex flex-col items-center justify-start">
            <div className="font-bold text-[16px]">About</div>

            <div className="mt-10 flex flex-col space-y-6 items-center text-[15px] ">
              <a href="mailto:flashxtrade@proton.me" className="cursor-pointer">
                Contact us
              </a>
            </div>
          </div>
        </div>

        <div className="my-14 text-[15px] text-center">&copy; FlashX 2024 Inc. All rights reserved</div>
      </div>
    </div>
  );
};
