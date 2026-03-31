import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TutorialState {
  hasSeenTutorial: boolean;
  setHasSeenTutorial: (seen: boolean) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenTutorial: false,
      setHasSeenTutorial: (seen) => set({ hasSeenTutorial: seen }),
    }),
    {
      name: 'tutorial-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
