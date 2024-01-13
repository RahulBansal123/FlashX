import { BiSolidPencil } from 'react-icons/bi';
import { RiMoneyDollarCircleFill } from 'react-icons/ri';
import { SiGoogleanalytics } from 'react-icons/si';
import { HiBellAlert } from 'react-icons/hi2';
import { FaShareNodes } from 'react-icons/fa6';
import { AiFillThunderbolt } from 'react-icons/ai';

const features = [
  {
    name: 'Market and Limit Orders',
    description:
      "Go for instant action with Market orders, or strategize your entries with Limit orders. The market's your playground, choose your weapon.",
    icon: BiSolidPencil,
  },
  {
    name: 'Portfolio Overview',
    description:
      'Your crypto kingdom at a glance. Track performance, monitor holdings, and optimize your strategy with a crystal-clear portfolio dashboard.',
    icon: RiMoneyDollarCircleFill,
  },
  {
    name: 'Analytics',
    description:
      'See the market breathe, feel the pulse of opportunity. Deep dive into real-time prices, meaure ROI, and trade with the future in your sights.',
    icon: SiGoogleanalytics,
  },
  {
    name: 'Real-time alerts',
    description:
      'Never miss a market move again. Get instant notifications for trade executions, low collateral, key events, and trading opportunities - stay ahead of the game, 24/7.',
    icon: HiBellAlert,
  },
  {
    name: 'Share trades',
    description:
      "Inspire & be inspired. Connect with your community, share your winning strategies, and learn from others' successes - trade together, thrive together.",
    icon: FaShareNodes,
  },
  {
    name: 'Lightning fast and secure',
    description:
      'Speed meets peace of mind. Execute trades in seconds, rest assured on robust security measures, and experience the effortless confidence of a cutting-edge platform.',
    icon: AiFillThunderbolt,
  },
];

export const Features = () => {
  return (
    <div className="py-24 sm:py-32" id="features">
      <div className="mx-auto p-6 lg:p-8 border border-[#9c9c9b] rounded-lg">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-[#8C8B79]">FEATURES</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-200 sm:text-4xl">
            How we make your life easier
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Engineered for performance, crafted for simplicity. See how we makes complex trading effortless.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map(feature => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                  <feature.icon className="h-5 w-5 flex-none text-[#8C8B79]" aria-hidden="true" />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-300">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};
