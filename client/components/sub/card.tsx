import Image from 'next/image';
import React from 'react';

interface Props {
  src: string;
  title: string;
  description: string;
  link: string;
}

export const Card = ({ src, title, description, link }: Props) => {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="relative overflow-hidden rounded-lg shadow-lg border border-stone-800 hover:scale-105 transition-all ease-in-out"
    >
      <Image src={src} alt={title} width={400} height={400} className="w-full object-cover" />

      <div className="relative p-4">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-5 text-gray-300 text-sm">{description}</p>
      </div>
    </a>
  );
};
