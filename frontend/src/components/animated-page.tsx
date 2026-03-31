import { motion, type Variants, type Transition } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedPageProps {
  children: ReactNode;
}

// iOS-style spring animation parameters
const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: 'easeOut',
    },
  },
};

export function AnimatedPage({ children }: AnimatedPageProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

// For lists - stagger children
export const listContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};
