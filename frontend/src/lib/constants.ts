export const INDUSTRIES = [
  { value: 'nails', label: 'Paznokcie' },
  { value: 'hair', label: 'Fryzjerstwo' },
  { value: 'cosmetics', label: 'Kosmetyka' },
  { value: 'physio', label: 'Fizjoterapia' },
  { value: 'trainer', label: 'Trening personalny' },
  { value: 'photo', label: 'Fotografia' },
  { value: 'tattoo', label: 'Tatuaż' },
  { value: 'other', label: 'Inne' },
] as const;

export const TAX_FORMS = [
  { value: 'ryczalt', label: 'Ryczałt 8.5%', rate: 8.5 },
  { value: 'skala', label: 'Skala podatkowa', rate: 12 },
  { value: 'liniowy', label: 'Podatek liniowy 19%', rate: 19 },
] as const;

export const DEFAULT_ZUS = 1600;

export const SUGGESTED_COSTS: Record<string, { name: string; amount: number }[]> = {
  nails: [
    { name: 'Czynsz lokalu', amount: 1500 },
    { name: 'Media (prąd/woda)', amount: 300 },
    { name: 'Internet', amount: 80 },
    { name: 'Ubezpieczenie', amount: 100 },
    { name: 'Środki czystości', amount: 150 },
  ],
  hair: [
    { name: 'Czynsz lokalu', amount: 2000 },
    { name: 'Media (prąd/woda)', amount: 400 },
    { name: 'Internet', amount: 80 },
    { name: 'Ubezpieczenie', amount: 100 },
    { name: 'Środki czystości', amount: 200 },
  ],
  cosmetics: [
    { name: 'Czynsz lokalu', amount: 1800 },
    { name: 'Media (prąd/woda)', amount: 350 },
    { name: 'Internet', amount: 80 },
    { name: 'Ubezpieczenie', amount: 100 },
    { name: 'Środki czystości', amount: 150 },
  ],
  trainer: [
    { name: 'Wynajem sali', amount: 800 },
    { name: 'Sprzęt (amortyzacja)', amount: 200 },
    { name: 'Ubezpieczenie OC', amount: 150 },
  ],
  default: [
    { name: 'Czynsz lokalu', amount: 1500 },
    { name: 'Media', amount: 300 },
    { name: 'Księgowość', amount: 300 },
  ],
};

export const SUGGESTED_SERVICES: Record<string, { name: string; price: number; duration: number; materialCost: number }[]> = {
  nails: [
    { name: 'Manicure hybrydowy', price: 130, duration: 75, materialCost: 15 },
    { name: 'Pedicure hybrydowy', price: 150, duration: 90, materialCost: 20 },
    { name: 'Zdjęcie hybrydy', price: 50, duration: 20, materialCost: 5 },
    { name: 'Przedłużanie żelem', price: 200, duration: 120, materialCost: 30 },
  ],
  hair: [
    { name: 'Strzyżenie damskie', price: 80, duration: 45, materialCost: 5 },
    { name: 'Strzyżenie męskie', price: 50, duration: 30, materialCost: 3 },
    { name: 'Koloryzacja', price: 200, duration: 120, materialCost: 40 },
    { name: 'Modelowanie', price: 60, duration: 30, materialCost: 5 },
  ],
  cosmetics: [
    { name: 'Makijaż dzienny', price: 150, duration: 60, materialCost: 20 },
    { name: 'Makijaż wieczorowy', price: 200, duration: 90, materialCost: 30 },
    { name: 'Zabieg nawilżający', price: 180, duration: 60, materialCost: 40 },
  ],
  trainer: [
    { name: 'Trening personalny', price: 120, duration: 60, materialCost: 0 },
    { name: 'Trening w parze', price: 160, duration: 60, materialCost: 0 },
    { name: 'Konsultacja', price: 80, duration: 30, materialCost: 0 },
  ],
  default: [
    { name: 'Usługa podstawowa', price: 100, duration: 60, materialCost: 10 },
  ],
};
