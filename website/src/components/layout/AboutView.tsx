import { motion } from 'motion/react';

const LUXURY_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const ABOUT_LINES = [
  'BOCA water is cold-infused sparkling mineral water',
  'bottled in a crystal-clear 12 fl oz PET vessel.',
  'Nothing opaque, no paper sleeve, no visual noise—',
  'just optical clarity from the clear pull-tab lid',
  'down to the thick domed base punt.',
  'High-pressure fine carbonation lifts slowly in',
  'delicate streams beneath a floating headspace meniscus,',
  'balanced to feel weightless in the hand and crisp on the table.',
] as const;

export function AboutView() {
  return (
    <motion.section
      key="about-view"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { duration: 0.7, ease: LUXURY_EASE },
      }}
      exit={{
        opacity: 0,
        y: -24,
        transition: { duration: 0.45, ease: LUXURY_EASE },
      }}
      aria-label="About Boca Water"
      className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center px-6 sm:px-14"
    >
      <div className="pointer-events-auto max-w-[780px] w-full">
        <div className="space-y-3 sm:space-y-4">
          {ABOUT_LINES.map((line, index) => (
            <div key={line} className="overflow-hidden">
              <motion.p
                initial={{
                  clipPath: 'inset(0 100% 0 0)',
                  opacity: 0.25,
                }}
                animate={{
                  clipPath: 'inset(0 0% 0 0)',
                  opacity: 1,
                }}
                transition={{
                  duration: 1.05,
                  delay: 0.18 + index * 0.22,
                  ease: LUXURY_EASE,
                }}
                className="font-ui text-[clamp(20px,2.7vw,34px)] font-normal leading-[1.32] tracking-[-0.02em] text-[#f6f5f1]/88"
              >
                {line}
              </motion.p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
