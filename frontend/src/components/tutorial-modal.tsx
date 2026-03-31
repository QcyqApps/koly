import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tutorialSlides } from '@/lib/tutorial-content';
import { useTutorialStore } from '@/store/tutorial-store';

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

export function TutorialModal({ open, onClose }: TutorialModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { setHasSeenTutorial } = useTutorialStore();

  const handleComplete = () => {
    setHasSeenTutorial(true);
    setCurrentSlide(0);
    onClose();
  };

  const handleNext = () => {
    if (currentSlide < tutorialSlides.length - 1) {
      setCurrentSlide((c) => c + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((c) => c - 1);
    }
  };

  const isLastSlide = currentSlide === tutorialSlides.length - 1;
  const slide = tutorialSlides[currentSlide];
  const Icon = slide.icon;

  return (
    <Dialog open={open} onOpenChange={handleComplete}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-8 text-center"
          >
            {Icon && (
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-8 w-8 text-primary" />
              </div>
            )}
            <h2 className="text-2xl font-bold mb-3">{slide.title}</h2>
            <p className="text-muted-foreground">{slide.description}</p>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="p-4 border-t flex items-center justify-between bg-muted/30">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Wstecz
          </Button>

          {/* Progress dots */}
          <div className="flex gap-1.5">
            {tutorialSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentSlide ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {isLastSlide ? (
            <Button onClick={handleComplete}>Zacznij</Button>
          ) : (
            <Button onClick={handleNext} className="gap-1">
              Dalej
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
