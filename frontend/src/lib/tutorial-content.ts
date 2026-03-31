import { BarChart3, MessageCircle, Calendar, Calculator, Images, Settings, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TutorialSlide {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon | null;
}

export const tutorialSlides: TutorialSlide[] = [
  {
    id: 'welcome',
    title: 'Witaj w Koly!',
    description: 'Twój osobisty asystent biznesowy. Poznaj funkcje, które pomogą Ci zarządzać Twoim biznesem i zwiększyć zyski.',
    icon: Sparkles,
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Przegląd najważniejszych wskaźników Twojego biznesu. Śledź przychody, zyski i porównuj się z branżą.',
    icon: BarChart3,
  },
  {
    id: 'chat',
    title: 'Chat AI',
    description: 'Rozmawiaj z inteligentnym asystentem. Zadawaj pytania o finanse, planowanie i strategię biznesową.',
    icon: MessageCircle,
  },
  {
    id: 'visits',
    title: 'Wizyty',
    description: 'Zarządzaj wizytami klientów. Dodawaj, edytuj i śledź status każdej wizyty w kalendarzu.',
    icon: Calendar,
  },
  {
    id: 'simulator',
    title: 'Symulator cen',
    description: 'Oblicz optymalne ceny usług. Sprawdź jak zmiany cen wpłyną na Twoje zyski.',
    icon: Calculator,
  },
  {
    id: 'gallery',
    title: 'Galeria',
    description: 'Przechowuj portfolio swoich prac. Generuj opisy na social media z pomocą AI.',
    icon: Images,
  },
  {
    id: 'settings',
    title: 'Ustawienia',
    description: 'Dostosuj aplikację do swoich potrzeb. Zarządzaj profilem, usługami i kosztami stałymi.',
    icon: Settings,
  },
];
