import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AnimatedPage } from './animated-page';

export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <AnimatedPage key={location.pathname}>
        {outlet}
      </AnimatedPage>
    </AnimatePresence>
  );
}
