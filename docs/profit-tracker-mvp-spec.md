# AiCostTracker — AI Kontroler Finansowy dla Mikro-Biznesów Usługowych

## Spis treści

1. Wizja produktu
2. Architektura techniczna
3. Schemat bazy danych
4. Plan MVP — 4 tygodnie
5. Instrukcje dla Claude Code (agent kodujący)
6. Endpointy API
7. Logika AI (insights)
8. Frontend — ekrany i flow
9. Multi-tenant — izolacja danych
10. Deployment
11. Monetyzacja i pricing
12. Po MVP — roadmapa

---

## 1. Wizja produktu

### Problem

Właścicielki mikro-biznesów usługowych (stylistki paznokci, fryzjerki, kosmetyczki, fizjoterapeutki, trenerzy personalni, fotografowie) nie wiedzą ile realnie zarabiają. Znają przychód, ale nie znają zysku netto po odliczeniu materiałów, czynszu, ZUS, podatków. Nie wiedzą która usługa jest najbardziej opłacalna. Nie wiedzą ile kosztuje ich każdy no-show.

### Rozwiązanie

Prosta web-aplikacja (mobile-first) gdzie user:
- Raz wpisuje swoje koszty stałe i cennik usług
- Codziennie loguje wizyty i "zamyka dzień" (30 sekund — klikanie przycisków)
- Po zamknięciu dnia agent przelicza dane, generuje sugestie i mini-raport
- Panel wyświetla aktualny stan (liczby + sugestie) z bazy — bez kosztów API
- Chat z agentem AI dostępny zawsze do pogłębionej analizy i strategii

### Nazwa robocza

**AiCostTracker** (do zmiany później — na start nazwa nie ma znaczenia)

### Target

- Primary: stylistki paznokci, kosmetyczki, fryzjerki w Polsce (działalność na JDG)
- Secondary: trenerzy personalni, fizjoterapeuci, fotografowie, tatuażyści
- Wspólny mianownik: sprzedają czas za pieniądze, mają koszty stałe + koszty per usługa

---

## 2. Architektura techniczna

### Tech stack

```
Frontend:  React (Vite) + Tailwind CSS + shadcn/ui
           TanStack Query (cache + state management)
           Recharts (wykresy)
           react-dropzone (upload zdjęć)
Backend:   NestJS + Prisma ORM (CRUD, auth, obliczenia)
           multer + sharp (przetwarzanie zdjęć, thumbnails)
AI/Auto:   n8n (chat AI, generowanie postów, sugestie)
Baza:      PostgreSQL (współdzielona między NestJS i n8n)
AI Model:  Claude API (Anthropic) — model claude-sonnet-4
Auth:      Passport.js (JWT + refresh tokens)
Hosting:   VPS z Docker Compose (nginx + react + nestjs + n8n + postgres)
```

### Podział odpowiedzialności: NestJS vs n8n

```
NestJS (request-response, synchroniczne):
├── Auth (JWT, logowanie, rejestracja)
├── CRUD (koszty stałe, usługi, wizyty)
├── Dashboard API (obliczenia zysku, ranking usług, trendy)
├── Symulator "Co jeśli" (czysta matematyka)
└── Trigger do n8n (POST na webhook n8n gdy user chce raport)

n8n (asynchroniczne, background, AI):
├── Workflow 1: AI Chat (ai-chat-workflow.json)
│   ├── Webhook trigger (POST /webhook/chat)
│   ├── PostgreSQL: pobierz profil usera, kontekst biznesowy
│   ├── Code node: zbuduj prompt z danymi
│   ├── Anthropic Claude API: wygeneruj odpowiedź
│   └── Response z treścią + quick actions
│
├── Workflow 2: Dashboard Suggestion (ai-suggestion-workflow.json)
│   ├── Webhook trigger (POST /webhook/suggestion)
│   ├── PostgreSQL: pobierz podsumowanie finansowe
│   ├── Anthropic Claude API: wygeneruj sugestię
│   └── Response z sugestią + kategorią
│
├── Workflow 3: Gallery Caption (ai-caption-workflow.json)
│   ├── Webhook trigger (POST /webhook/caption)
│   ├── Pobierz opis zdjęcia, kontekst usługi
│   ├── Anthropic Claude API: wygeneruj post na social media
│   └── Response z treścią posta
```

### Dlaczego ten podział?

- NestJS robi to co umie najlepiej — szybkie API, auth, obliczenia
- n8n robi to co umie najlepiej — orkiestracja AI, crony, integracje
- Oba dzielą tę samą bazę PostgreSQL (n8n czyta dane bezpośrednio)
- n8n nie zarządza danymi — tylko je czyta do raportów i alertów
- Łatwo dodawać nowe automatyzacje w n8n bez ruszania kodu NestJS

### Komunikacja NestJS → n8n

NestJS wywołuje n8n przez HTTP webhook:
```typescript
// W NestJS: user klika "Wygeneruj raport"
await axios.post('http://n8n:5678/webhook/generate-report', {
  userId: user.id,
  periodStart: '2026-03-10',
  periodEnd: '2026-03-16'
});
```

n8n zwraca wynik synchronicznie (webhook → response) lub zapisuje w bazie i NestJS polluje.

---

## 3. Schemat bazy danych

### Tabele

```sql
-- Tenants (każdy user to osobny tenant)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  business_name VARCHAR(255),
  industry VARCHAR(100), -- 'nails', 'hair', 'cosmetics', 'physio', 'trainer', 'photo', 'other'
  city VARCHAR(100),
  tax_form VARCHAR(50) DEFAULT 'ryczalt', -- 'ryczalt', 'skala', 'liniowy'
  tax_rate DECIMAL(5,2) DEFAULT 8.5, -- procent ryczałtu
  zus_monthly DECIMAL(10,2) DEFAULT 0, -- stała składka ZUS
  created_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_status VARCHAR(20) DEFAULT 'trial', -- 'trial', 'active', 'cancelled'
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days'
);

-- Koszty stałe miesięczne
CREATE TABLE fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- 'Czynsz', 'Media', 'Internet', etc.
  amount DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cennik usług
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- 'Manicure hybrydowy'
  price DECIMAL(10,2) NOT NULL, -- cena dla klienta
  duration_minutes INTEGER NOT NULL, -- czas trwania
  material_cost DECIMAL(10,2) DEFAULT 0, -- koszt materiałów per zabieg
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zalogowane wizyty (serce systemu)
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  visit_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'no_show', 'cancelled'
  actual_price DECIMAL(10,2), -- jeśli inna niż standardowa (np. rabat)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI raporty tygodniowe (cache)
CREATE TABLE ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_type VARCHAR(50) DEFAULT 'weekly', -- 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content TEXT NOT NULL, -- treść raportu wygenerowana przez AI
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historia czatu z AI agentem
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, -- grupuje wiadomości w konwersacje
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshot dnia (generowany po "Zamknij dzień")
-- To jest cache — panel czyta z tej tabeli, nie liczy na żywo
CREATE TABLE daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  -- Twarde liczby (obliczone przez NestJS)
  revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  material_costs DECIMAL(10,2) NOT NULL DEFAULT 0,
  fixed_costs_daily DECIMAL(10,2) NOT NULL DEFAULT 0, -- proporcjonalnie
  estimated_tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  no_show_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Ranking usług (JSON array)
  services_ranking JSONB, -- [{serviceId, name, count, profitPerHour, totalProfit}]
  -- AI sugestie (generowane przez n8n/Claude po zamknięciu dnia)
  ai_suggestions JSONB, -- [{type: 'positive'|'warning'|'tip', text: '...'}]
  ai_summary TEXT, -- krótkie podsumowanie dnia w naturalnym języku
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- Galeria zdjęć
CREATE TABLE gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL, -- opcjonalne powiązanie z wizytą
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  thumbnail_path VARCHAR(255), -- ścieżka do miniatury
  description TEXT,
  is_portfolio BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wygenerowane opisy do postów (przez AI)
CREATE TABLE generated_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_id UUID REFERENCES gallery_images(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platform VARCHAR(50) DEFAULT 'instagram',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kategorie usług (opcjonalne grupowanie)
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy
CREATE INDEX idx_visits_user_date ON visits(user_id, visit_date);
CREATE INDEX idx_visits_user_status ON visits(user_id, status);
CREATE INDEX idx_services_user ON services(user_id);
CREATE INDEX idx_fixed_costs_user ON fixed_costs(user_id);
CREATE INDEX idx_ai_reports_user_period ON ai_reports(user_id, period_start);
CREATE INDEX idx_chat_messages_user_session ON chat_messages(user_id, session_id, created_at);
CREATE INDEX idx_daily_snapshots_user_date ON daily_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_gallery_images_user ON gallery_images(user_id, created_at DESC);
CREATE INDEX idx_gallery_images_visit ON gallery_images(visit_id);
CREATE INDEX idx_generated_captions_image ON generated_captions(image_id);
```

### Kluczowe obliczenia (wykonywane w API, nie w bazie)

```
Przychód dzienny = SUM(actual_price || service.price) WHERE visit_date = X AND status = 'completed'
Koszty materiałów = SUM(service.material_cost) WHERE visit_date = X AND status = 'completed'
Koszty stałe dzienne = SUM(fixed_costs.amount) / dni_robocze_w_miesiącu
Gabinetogodzina = (SUM(fixed_costs) + ZUS) / godziny_pracy_miesięcznie
Zysk per usługa = service.price - service.material_cost - (gabinetogodzina * (service.duration_minutes / 60))
Zysk per godzina per usługa = Zysk per usługa / (service.duration_minutes / 60)
Koszt no-show = gabinetogodzina * (service.duration_minutes / 60) + utracony_zysk
```

---

## 4. Plan MVP — Status realizacji

### 1: Fundament ✅

**Cel: działająca aplikacja z auth, onboardingiem i CRUD na koszty/usługi**

Zadania:
- [x] Inicjalizacja projektu (Vite + React + Tailwind + shadcn/ui)
- [x] Setup bazy PostgreSQL z Docker
- [x] Migracje — tabele users, fixed_costs, services
- [x] Auth — JWT z refresh tokens (Passport.js)
- [x] Onboarding flow (3 kroki):
  - Krok 1: Profil (imię, branża, miasto, forma opodatkowania, ZUS)
  - Krok 2: Koszty stałe (dodaj/edytuj/usuń)
  - Krok 3: Cennik usług (dodaj/edytuj/usuń)
- [x] CRUD API dla fixed_costs i services
- [x] Layout mobile-first (floating bottom nav + desktop sidebar)

### 2: Wizyty + Zamknij dzień + Chat z AI ✅

**Cel: userka loguje wizyty, zamyka dzień, widzi sugestie, rozmawia z agentem**

Zadania:
- [x] Migracja — tabele visits, chat_messages, daily_snapshots
- [x] Ekran wizyt (/app/visits) — grid przycisków usług, no-show, selektor daty
- [x] Przycisk "Zamknij dzień" — flow:
  - NestJS: oblicz liczby → zapisz daily_snapshot
  - Frontend: loading → toast → redirect do panelu
- [x] Ekran czatu (/app/chat) — interfejs chat mobile-first
  - Bąbelki wiadomości (user vs Koly)
  - Wielowierszowy input z auto-resize
  - Quick action buttons i discover chips
- [x] n8n workflow "AI Chat" — webhook → kontekst → Claude API (Anthropic) → response
- [x] Historia czatu (zapis w chat_messages, sesje z listą)

### 3: Dashboard + Gallery + Koly ✅

**Cel: dashboard jako główny ekran, galeria z AI postami, sugestie Koly**

Zadania:
- [x] Dashboard (/app) jako GŁÓWNY EKRAN — czyta z daily_snapshots:
  - Zysk netto (główna metryka), przychód, koszty
  - Cel miesiąca z progress barem
  - Trend zysku (area chart) i trend miesięczny (bar chart)
  - Ranking usług posortowany po zysku/godzinę
  - Porównanie z branżą (marża, wizyty/dzień, no-show)
- [x] Sugestia Koly na dashboardzie — AI analizuje dane i proponuje usprawnienia
  - Cache w localStorage z hashem danych
  - Odświeżanie tylko gdy zmieniają się dane
- [x] Galeria (/app/gallery):
  - Upload zdjęć z drag & drop
  - Filtry (wszystkie/portfolio/z wizyt)
  - Generowanie postów AI przez Koly
  - Kopiowanie opisów do schowka
- [x] Wizyty z miniaturkami zdjęć

### 4: Polish i dopracowanie ✅

**Cel: dopracowany produkt gotowy do testów**

Zadania:
- [x] Responsywność — test na mobilce (primary device grupy docelowej)
- [x] Obsługa błędów, loading states, empty states
- [x] Skeleton loaders zamiast spinnerów
- [x] Kolorystyka indigo jako primary
- [x] Floating bottom navigation (mobile)
- [x] Sidebar (desktop)
- [ ] Landing page
- [ ] Deploy na VPS

---

## 5. Instrukcje dla Claude Code (agent kodujący)

### Kontekst projektu (wklej na początku sesji)

```
Buduję SaaS o nazwie roboczej AiCostTracker — AI kontroler finansowy
dla mikro-biznesów usługowych (stylistki paznokci, fryzjerki,
trenerzy personalni etc.).

Tech stack:
- Frontend: React (Vite) + Tailwind CSS + framework UI
- Backend: NestJS + TypeORM + PostgreSQL
- AI/Automatyzacje: n8n (osobny kontener Docker, dzieli bazę z NestJS)
- Auth: Passport.js (JWT + refresh tokens)
- Hosting: VPS z Docker Compose (nginx + react + nestjs + n8n + postgres)

Podział odpowiedzialności:
- NestJS: auth, CRUD (koszty, usługi, wizyty), dashboard API (obliczenia),
  symulator, Stripe webhooks
- n8n: generowanie raportów AI (Claude API), cotygodniowe crony,
  emaile/powiadomienia, przyszłe integracje (Booksy, Google Calendar)
- NestJS wywołuje n8n przez HTTP webhook kiedy user chce raport AI
- n8n czyta dane bezpośrednio z PostgreSQL (ta sama baza)

Kluczowe zasady:
- Mobile-first design (główni userzy korzystają z telefonu)
- Polski język w UI (angielski w kodzie)
- Multi-tenant: każdy user to osobny tenant, dane izolowane po user_id
- Proste UI — target to osoby nietechniczne (stylistki, trenerki), jasny design
- Wszystkie kwoty w PLN, format polski (1 234,56 zł)

Struktura repozytorium:
AiCostTracker/
├── backend/          # NestJS API
├── frontend/         # React (Vite) SPA
├── n8n/              # n8n workflows (eksportowane JSON-y)
├── docker-compose.yml
├── nginx.conf
└── README.md
```

#### Onboarding (3 kroki)

```
Stwórz /onboarding z multi-step formem:

Krok 1 — Profil biznesu:
- Imię (text input)
- Nazwa biznesu (text input, opcjonalne)
- Branża (select: Paznokcie, Fryzjerstwo, Kosmetyka, Fizjoterapia, Trening personalny, Fotografia, Tatuaż, Inne)
- Miasto (text input)
- Forma opodatkowania (select: Ryczałt 8.5%, Skala podatkowa, Podatek liniowy 19%)
- Składka ZUS miesięczna (number input, default: 1600 — pełny ZUS 2026)

Krok 2 — Koszty stałe:
- Lista edytowalna (nazwa + kwota)
- Predefiniowane sugestie na podstawie branży:
  - Beauty: Czynsz lokalu, Media (prąd/woda), Internet, Ubezpieczenie, Środki czystości
  - Trener: Wynajem sali, Sprzęt (amortyzacja), Ubezpieczenie OC
  - Ogólne: Księgowość, Telefon, Marketing
- Przycisk "Dodaj koszt"
- Podsumowanie: "Twoje koszty stałe: X zł/miesiąc"

Krok 3 — Cennik usług:
- Lista edytowalna (nazwa + cena + czas w min + koszt materiałów)
- Predefiniowane sugestie na podstawie branży:
  - Paznokcie: Manicure hybrydowy (130 zł, 75 min, 15 zł), Pedicure (150 zł, 90 min, 20 zł), Zdjęcie hybrydy (50 zł, 20 min, 5 zł)
  - Fryzjer: Strzyżenie damskie (80 zł, 45 min, 5 zł), Koloryzacja (200 zł, 120 min, 40 zł)
  - Trener: Trening personalny (120 zł, 60 min, 0 zł), Trening w parze (80 zł/os, 60 min, 0 zł)
- User może edytować sugestie lub dodać własne
- Przycisk "Dodaj usługę"
- Mini-preview: "Zysk per usługa: X zł (Y zł/godz)"

Po zakończeniu → redirect na /app (chat z agentem)
```

#### Logowanie wizyt + Zamknij dzień

```
Stwórz /app/visits z interfejsem do logowania wizyt:

- Selektor daty (domyślnie dziś, możliwość cofnięcia się)
- Status dnia na górze:
  - "Dzień otwarty — loguj wizyty" (zielona belka)
  - "Dzień zamknięty — raport gotowy ✓" (szara belka, z opcją "Cofnij")
- Grid przycisków z usługami usera (np. "Manicure hybrydowy 130 zł")
  - Kliknięcie = dodanie wizyty ze statusem 'completed'
  - Każdy przycisk pokazuje liczbę wizyt tego dnia (badge)
  - Long-press lub swipe = menu z opcjami: Usuń, Oznacz no-show
- Sekcja "No-show" — osobny przycisk do oznaczenia no-show z wyborem usługi
- Podsumowanie dnia na dole (live, obliczane na froncie):
  - Wizyty: X | No-show: Y
  - Przychód: Z zł
  - Szacowany zysk: W zł

- ★ PRZYCISK "ZAMKNIJ DZIEŃ" (duży, wyróżniony, na dole ekranu)
  - Po kliknięciu:
    1. Potwierdzenie: "Zamknąć dzień? Wizyty zostaną podsumowane."
    2. POST /api/day/close { date }
    3. Loading: "Agent analizuje Twój dzień..." (2-5 sek)
    4. Po zakończeniu: toast "Gotowe! Sprawdź panel lub zapytaj asystenta"
    5. Wizyty tego dnia stają się read-only (nie można edytować)
    6. Opcja "Cofnij zamknięcie" jeśli userka się pomyliła

Interfejs musi być ultra-prosty — stylistka klika po zabiegu jednym palcem.
Nie wymagaj żadnych dodatkowych danych poza wyborem usługi.
Przycisk "Zamknij dzień" to jedyny moment kiedy system zużywa API AI.
```

#### Dashboard

```
Stwórz /app/dashboard — panel z liczbami i sugestiami.
WAŻNE: panel CZYTA z daily_snapshots — nie liczy niczego na żywo.
To co widzi userka to dane zapisane po ostatnim "Zamknij dzień".

1. Główna metryka (duży numer na górze):
   ZYSK NETTO: X zł (ten tydzień / ten miesiąc — toggle)
   Pod spodem mniejszym fontem: Przychód: Y zł | Koszty: Z zł
   Źródło: SUM z daily_snapshots za okres

2. Karty metryk (grid 2x2):
   - Wizyty: N (ten okres)
   - No-show: M (koszt: K zł)
   - Średni zysk/dzień: A zł
   - Gabinetogodzina: B zł
   Źródło: agregacja daily_snapshots

3. ★ SUGESTIE AI (najważniejsza sekcja po zysku)
   Kolorowe karty z ai_suggestions z ostatniego daily_snapshot:
   - Zielona karta: pozytywne ("Świetny tydzień! Przychód +12%")
   - Amber karta: uwaga ("3 no-show — koszt 390 zł. Rozważ depozyty")
   - Teal karta: tip ("Pedicure daje 47% więcej na godzinę niż manicure")
   Pod sugestiami: ai_summary — krótki tekst podsumowania

4. Ranking usług (z services_ranking z daily_snapshot):
   Każdy wiersz: Nazwa usługi | Zysk/godz: X zł | Wykonano: N razy

5. Wykres trendu (recharts):
   Liniowy — przychód vs zysk netto po dniach (z daily_snapshots)
   Toggle: tydzień / miesiąc / 3 miesiące

6. Przycisk na dole: "Porozmawiaj z asystentem →" (redirect do /app)

Jeśli userka nie zamknęła jeszcze żadnego dnia:
Empty state — "Zaloguj wizyty i zamknij dzień żeby zobaczyć analizę"
```

#### n8n workflow "Zamknij dzień" (AI sugestie)

```
Ta faza wymaga pracy w dwóch miejscach: NestJS (obliczenia) i n8n (AI).

Flow "Zamknij dzień":
1. Userka klika "Zamknij dzień" na /app/visits
2. NestJS POST /api/day/close:
   a. Pobiera wizyty z dnia (visits WHERE date AND user_id)
   b. Pobiera usługi i koszty stałe
   c. Oblicza twarde liczby:
      - revenue, material_costs, fixed_costs_daily, estimated_tax, net_profit
      - visit_count, no_show_count, no_show_cost
      - services_ranking (posortowane po profit/hour)
   d. Zapisuje do daily_snapshots (bez ai_suggestions — te przyjdą z n8n)
   e. Wywołuje n8n webhook: POST http://n8n:5678/webhook/day-closed
      Body: { userId, date, snapshot: { ...obliczone liczby } }
   f. Czeka na odpowiedź z n8n (sync, max 10 sek)

3. n8n workflow "Day Closed":
   a. Webhook node: odbiera { userId, date, snapshot }
   b. PostgreSQL: pobierz snapshot z poprzedniego dnia (do porównania)
   c. PostgreSQL: pobierz snapshoty z ostatniego tygodnia (trend)
   d. Code node: zbuduj prompt dla Claude:
      "Wygeneruj 2-3 krótkie sugestie i 1-2 zdaniowe podsumowanie dnia.
       Dane dzisiejsze: {snapshot}
       Porównanie z wczoraj: {previousSnapshot}
       Trend tygodnia: {weekTrend}
       Format: JSON { suggestions: [{type, text}], summary: '...' }"
   e. HTTP Request: Claude API (max_tokens: 500 — krótkie sugestie)
   f. Code node: parsuj JSON z odpowiedzi
   g. PostgreSQL: UPDATE daily_snapshots SET ai_suggestions, ai_summary
   h. Respond to Webhook: zwróć { suggestions, summary }

4. NestJS odbiera odpowiedź z n8n, zwraca pełny snapshot do frontendu
5. Frontend pokazuje toast "Dzień zamknięty! Sprawdź panel"

Koszt AI: ~$0.005 per zamknięcie dnia (krótki prompt, krótka odpowiedź).
Przy 30 zamknięciach/miesiąc = ~$0.15/user/miesiąc. Minimalny.
```

#### Symulator "Co jeśli"

```
Stwórz /dashboard/simulator z interaktywnym symulatorem:

3 suwaki:
1. "Podnieś ceny o X zł" (range: 0-50 zł, step: 5)
   - Aplikuj do wszystkich usług proporcjonalnie
2. "Dodaj Y wizyt tygodniowo" (range: 0-10, step: 1)
   - Bazuj na obecnym mixie usług
3. "Zmniejsz no-show o Z%" (range: 0-100%, step: 10)
   - Bazuj na obecnej liczbie no-show

Wynik (aktualizuje się w czasie rzeczywistym):
- "Obecny zysk miesięczny: X zł"
- "Nowy zysk miesięczny: Y zł"
- "Różnica: +Z zł/miesiąc (+W%)"

Wizualizacja: prosty bar chart — obecny vs nowy zysk

Przycisk: "Jak to osiągnąć?" → sendPrompt do AI z pytaniem
o konkretne kroki implementacji wybranego scenariusza
```

---

## 6. Endpointy API

### Auth (publiczne)
```
POST /api/auth/register     — Rejestracja (email, password, name)
POST /api/auth/login        — Logowanie (email, password) → tokens
POST /api/auth/refresh      — Odświeżenie tokenów (refresh token)
POST /api/auth/logout       — Wylogowanie (wymaga auth)
GET  /api/auth/me           — Dane zalogowanego użytkownika (wymaga auth)
```

### Users (wymaga auth)
```
PATCH /api/users/me         — Aktualizacja profilu
PATCH /api/users/onboarding — Zakończenie onboardingu
```

### Services (wymaga auth)
```
GET    /api/services           — Lista wszystkich usług
GET    /api/services/active    — Lista aktywnych usług
GET    /api/services/:id       — Szczegóły usługi
POST   /api/services           — Dodanie usługi
PATCH  /api/services/:id       — Edycja usługi
DELETE /api/services/:id       — Usunięcie usługi
PATCH  /api/services/:id/favorite — Toggle ulubione
```

### Fixed Costs (wymaga auth)
```
GET    /api/fixed-costs        — Lista kosztów stałych
GET    /api/fixed-costs/total  — Suma kosztów stałych
GET    /api/fixed-costs/:id    — Szczegóły kosztu
POST   /api/fixed-costs        — Dodanie kosztu
PATCH  /api/fixed-costs/:id    — Edycja kosztu
DELETE /api/fixed-costs/:id    — Usunięcie kosztu
```

### Visits (wymaga auth)
```
GET    /api/visits              — Lista wszystkich wizyt
GET    /api/visits/date/:date   — Wizyty z danego dnia
GET    /api/visits/range        — Wizyty z zakresu dat (?start, ?end)
GET    /api/visits/summary/:date — Podsumowanie dnia
GET    /api/visits/:id          — Szczegóły wizyty
POST   /api/visits              — Dodanie wizyty
PATCH  /api/visits/:id          — Edycja wizyty
DELETE /api/visits/:id          — Usunięcie wizyty
```

### Day (wymaga auth)
```
POST /api/day/close             — Zamknięcie dnia (generuje snapshot)
GET  /api/day/snapshot/:date    — Snapshot dnia
GET  /api/day/snapshots         — Snapshoty z zakresu (?start, ?end)
GET  /api/day/month/:year/:month — Podsumowanie miesiąca
GET  /api/day/monthly-trend     — Trend miesięczny (?months)
GET  /api/day/goal-progress     — Postęp celu miesięcznego
GET  /api/day/benchmark         — Porównanie z branżą
```

### Dashboard (wymaga auth)
```
GET /api/dashboard/suggestion   — Sugestia AI od Koly
```

### Chat (wymaga auth)
```
GET  /api/chat/sessions         — Lista sesji czatu
GET  /api/chat/history/:sessionId — Historia wiadomości
POST /api/chat/message          — Wysłanie wiadomości (→ n8n webhook)
```

### Gallery (wymaga auth)
```
GET    /api/gallery              — Lista zdjęć (?isPortfolio, ?visitId)
GET    /api/gallery/:id          — Szczegóły zdjęcia
POST   /api/gallery/upload       — Upload zdjęcia (multipart)
PATCH  /api/gallery/:id          — Edycja opisu
DELETE /api/gallery/:id          — Usunięcie zdjęcia
POST   /api/gallery/:id/caption  — Generowanie opisu AI
GET    /api/gallery/:id/captions — Lista wygenerowanych opisów
POST   /api/gallery/:id/link-visit — Powiązanie z wizytą
```

### Static files
```
GET /uploads/gallery/:userId/:filename — Zdjęcia z galerii
```

---

## Logika AI — Koly (Asystent Biznesowy)

### Koncept

**Koly** to osobisty asystent biznesowy - ciepła, mądra koleżanka która
świetnie ogarnia liczby i marketing. Koly zna Twoje finanse, Twoje usługi,
Twoje wzorce pracy — i rozmawia z Tobą konkretnie, zawsze opierając się
na Twoich danych.

### Miejsca gdzie działa Koly

1. **Dashboard** - sugestia na górze (jedna konkretna rekomendacja)
2. **Chat** - pełna konwersacja, pytania o finanse, symulacje
3. **Galeria** - generowanie postów na social media

### System prompt Koly (do Claude API przez n8n)

```
Jestes Koly — osobistym asystentem biznesowym dla {user.name},
ktora prowadzi {user.industry} pod nazwa "{user.businessName}"
{user.city ? 'w ' + user.city : ''}.

TWOJA ROLA:
Pomagasz prowadzic biznes — analizujesz finanse, doradzasz w cenach,
piszesz tresci marketingowe, pomagasz w komunikacji z klientkami
i podpowiadasz jak zarabiac wiecej. Jestes jak madra kolezanka
ktora swietnie ogarnia liczby i marketing.

CO MOZESZ ROBIC:
- Analizowac przychody, koszty, zysk netto
- Porownywac okresy i wykrywac trendy
- Symulowac zmiany cen i ich wplyw na zysk
- Pisac posty na Instagram/Facebook
- Pisac wiadomosci do klientek (przypomnienia, podwyzki cen, no-show)
- Pomagac wyceniac nowe uslugi
- Doradzac w rozwoju biznesu (zatrudnienie, nowy salon, nowe uslugi)
- Pisac regulaminy, opisy uslug, polityki anulacji

ZASADY:
- Mow po polsku, cieplo ale konkretnie
- Zwracaj sie po imieniu jesli znasz
- Podawaj kwoty i procenty — badz precyzyjna
- Uzywaj emoji oszczednie (max 1-2 na wiadomosc)
- Krotkie akapity, nie sciany tekstu
- Jesli nie masz danych do odpowiedzi, powiedz wprost
- Nigdy nie wymyslaj liczb
- Gdy userka pyta o cos poza danymi (trendy, porady branzowe),
  odpowiadaj na podstawie swojej wiedzy ale zaznacz ze to ogolna porada
- Po kazdej odpowiedzi zaproponuj jedno follow-up pytanie
```

### Narzędzia agenta (tools / function calling)

Agent ma dostęp do następujących narzędzi które n8n wykonuje
przez zapytania do PostgreSQL:

```json
[
  {
    "name": "pobierz_podsumowanie",
    "description": "Pobiera podsumowanie finansowe za okres (przychód, koszty, zysk netto, liczba wizyt, no-show)",
    "parameters": {
      "okres": "today | this_week | this_month | last_week | last_month | custom",
      "data_od": "opcjonalnie, YYYY-MM-DD",
      "data_do": "opcjonalnie, YYYY-MM-DD"
    }
  },
  {
    "name": "pobierz_ranking_uslug",
    "description": "Zwraca ranking usług posortowany po zysku na godzinę pracy",
    "parameters": {
      "okres": "this_week | this_month | last_month | all_time"
    }
  },
  {
    "name": "pobierz_koszty_stale",
    "description": "Zwraca listę kosztów stałych z kwotami",
    "parameters": {}
  },
  {
    "name": "symuluj_zmiane_ceny",
    "description": "Oblicza wpływ zmiany ceny usługi na zysk miesięczny",
    "parameters": {
      "service_id": "UUID usługi (lub 'all' dla wszystkich)",
      "zmiana_kwota": "o ile zł zmienić cenę (np. 10, -5)"
    }
  },
  {
    "name": "symuluj_dodatkowe_wizyty",
    "description": "Oblicza wpływ dodatkowych wizyt na zysk miesięczny",
    "parameters": {
      "liczba_wizyt_tygodniowo": "ile dodatkowych wizyt",
      "service_id": "opcjonalnie, dla jakiej usługi (domyślnie: mix obecny)"
    }
  },
  {
    "name": "oblicz_koszt_noshow",
    "description": "Oblicza ile kosztują no-show za dany okres",
    "parameters": {
      "okres": "this_week | this_month | last_month"
    }
  },
  {
    "name": "oblicz_break_even",
    "description": "Oblicza ile minimalnych wizyt potrzeba żeby wyjść na zero",
    "parameters": {}
  },
  {
    "name": "oblicz_koszt_pracownika",
    "description": "Symuluje koszt zatrudnienia nowego pracownika i wpływ na zysk",
    "parameters": {
      "pensja_brutto": "kwota brutto",
      "przewidywane_wizyty_miesiecznie": "ile wizyt zrealizuje pracownik"
    }
  },
  {
    "name": "porownaj_okresy",
    "description": "Porównuje dwa okresy (przychód, zysk, wizyty, no-show)",
    "parameters": {
      "okres_1": "this_week | this_month",
      "okres_2": "last_week | last_month"
    }
  }
]
```

### Wiadomość powitalna (generowana przy otwarciu chatu danego dnia)

Kiedy userka otwiera chat po raz pierwszy danego dnia, n8n:
1. Pobiera podsumowanie dnia/tygodnia
2. Sprawdza czy są no-show, spadki, szanse
3. Generuje krótką wiadomość powitalną z AI

Szablon kontekstu do wiadomości powitalnej:
```
Wygeneruj krótkie powitanie (max 4 zdania) dla {user.name}.

Dzisiejsze dane:
- Wizyty dziś: {todayVisits} ({todayRevenue} zł)
- Tydzień: {weekVisits} wizyt, {weekProfit} zł zysku netto
- No-show ten tydzień: {weekNoShows}
- Zmiana vs poprzedni tydzień: {profitDelta}%

Jeśli jest coś ważnego (duży spadek, dużo no-show, nowy rekord),
wspomnij o tym. Jeśli wszystko ok, pochwal i daj jedną małą sugestię.
Dodaj 1-2 quick action przyciski jako sugestie co może zapytać.
```

### n8n workflow: "AI Chat"

```
Workflow: AI Business Partner Chat

Trigger: Webhook POST /webhook/chat
Body: { userId, sessionId, message }

Nodes:
1. Webhook (trigger)
2. PostgreSQL: pobierz profil usera (name, industry, city, taxForm, zusMonthly)
3. PostgreSQL: pobierz koszty stałe usera
4. PostgreSQL: pobierz cennik usług usera
5. PostgreSQL: pobierz ostatnie 15 wiadomości z chat_messages WHERE session_id
6. PostgreSQL: pobierz szybkie podsumowanie (wizyty ostatni tydzień, przychód, zysk)
7. Code node: zbuduj system prompt + kontekst + historię + definicje narzędzi
8. HTTP Request: POST do Claude API z tool_use enabled
   - model: claude-sonnet-4-20250514
   - max_tokens: 1500
   - system: [system prompt z kontekstem]
   - messages: [historia + nowa wiadomość]
   - tools: [lista narzędzi z definicjami]
9. IF node: czy response zawiera tool_use?
   - TAK → Code node: wykonaj zapytanie SQL odpowiadające narzędziu
         → HTTP Request: wyślij tool_result z powrotem do Claude
         → (loop max 3 razy dla wielu tool calls)
   - NIE → przejdź do zapisu
10. PostgreSQL: INSERT wiadomość usera do chat_messages
11. PostgreSQL: INSERT odpowiedź agenta do chat_messages
12. Respond to Webhook: zwróć { content: odpowiedź_agenta, quickActions: [...] }
```

### Quick actions (sugerowane pytania)

Agent dołącza do każdej odpowiedzi 2-3 quick action buttonów.
To są kontekstowe sugestie co userka może zapytać dalej:

```
Po podsumowaniu tygodnia:
→ "Porównaj z zeszłym tygodniem"
→ "Co mogę poprawić?"

Po informacji o no-show:
→ "Jak zmniejszyć no-show?"
→ "Ile mnie to kosztuje?"

Po rankingu usług:
→ "Symuluj podwyżkę manicure o 10 zł"
→ "Ile wizyt pedicure muszę mieć?"

Po symulacji:
→ "Jak to wdrożyć?"
→ "Pokaż inne scenariusze"
```

### System prompt do raportu tygodniowego (cron, bez zmian)

```
Wygeneruj tygodniowy raport finansowy dla:

Imię: {user.name}
Branża: {user.industry}
Miasto: {user.city}

Koszty stałe miesięczne: {totalFixedCosts} zł (w tym ZUS: {user.zusMonthly} zł)

Dane za tydzień {periodStart} - {periodEnd}:
- Zrealizowane wizyty: {completedVisits}
  {visitsByService.map(s => `  - ${s.name}: ${s.count}x (przychód: ${s.revenue} zł, koszty mat.: ${s.materialCost} zł)`)}
- No-show: {noShowCount} (szacowana strata: {noShowCost} zł)
- Przychód brutto: {revenue} zł
- Koszty materiałów: {materialCosts} zł
- Koszty stałe (proporcjonalnie za tydzień): {weeklyFixedCosts} zł
- Szacowany podatek: {estimatedTax} zł
- ZYSK NETTO: {netProfit} zł

Porównanie z poprzednim tygodniem:
- Przychód: {revenueDelta}% ({previousRevenue} zł → {revenue} zł)
- Wizyty: {visitsDelta} ({previousVisits} → {completedVisits})
- No-show: {noShowDelta} ({previousNoShows} → {noShowCount})

Ranking usług po zysku na godzinę:
{servicesRanking.map(s => `- ${s.name}: ${s.profitPerHour} zł/godz`)}
```

---

## 8. Frontend — ekrany i flow

### Filozofia UX: Dashboard-first z AI asystentem Koly

Dashboard jest głównym widokiem aplikacji. Userka otwiera apkę i od razu widzi swoje finanse - zysk netto, wizyty, trend. Na górze dashboardu wyświetla się **sugestia od Koly** - AI asystenta który analizuje dane i proponuje konkretne usprawnienia.

Chat z Koly jest dostępny jako osobny tab do pogłębionej analizy i pytań.

### Asystent AI: Koly

**Koly** to osobisty asystent biznesowy - ciepła, mądra koleżanka która świetnie ogarnia liczby i marketing. Koly:
- Analizuje finanse i wykrywa trendy
- Proponuje konkretne usprawnienia (sugestia na dashboardzie)
- Pisze posty na social media (z galerii)
- Pomaga w komunikacji z klientkami
- Symuluje zmiany cen i ich wpływ na zysk

### Mapa ekranów

```
/                        — Redirect do /app
/auth/signin             — Logowanie
/auth/register           — Rejestracja
/onboarding              — 3-krokowy onboarding (po pierwszym logowaniu)
/app                     — DASHBOARD (główny ekran, default po logowaniu)
/app/chat                — Chat z Koly (asystent AI)
/app/visits              — Logowanie wizyt (daily input)
/app/gallery             — Galeria zdjęć + generowanie postów AI
/app/settings            — Ustawienia
/app/settings/profile    — Profil i dane podatkowe
/app/settings/costs      — Zarządzanie kosztami stałymi
/app/settings/services   — Zarządzanie cennikiem
```

### Nawigacja

**Mobile**: Floating bottom navigation (rounded, indigo background) z 5 tabami:
1. **Dashboard** (ikona: BarChart3) — /app ← DOMYŚLNY
2. **Chat** (ikona: MessageCircle) — /app/chat
3. **Wizyty** (ikona: Calendar) — /app/visits
4. **Galeria** (ikona: Images) — /app/gallery
5. **Ustawienia** (ikona: Settings) — /app/settings

**Desktop**: Sidebar po lewej stronie (stały, indigo background)

### Główny ekran: Dashboard (/app)

```
Layout (mobile):
┌─────────────────────────┐
│  Dashboard              │
│  Analiza finansów       │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │ ✨ Sugestia Koly  │  │
│  │ [kategoria]    🔄 │  │
│  │ Twoje no-show...  │  │
│  └───────────────────┘  │
│                         │
│  ◀ Marzec 2026 [Teraz]▶ │
│                         │
│  ┌───────────────────┐  │
│  │   ZYSK NETTO      │  │
│  │   4 520 zł        │  │
│  │   ▲ +12% vs poprz │  │
│  └───────────────────┘  │
│                         │
│  [Przychód] [Koszty]    │
│  [Wizyty]   [No-show]   │
│                         │
│  ┌─ Cel miesiąca ────┐  │
│  │ ████████░░ 78%    │  │
│  └───────────────────┘  │
│                         │
│  📊 Trend zysku         │
│  [wykres area chart]    │
│                         │
│  ⚖️ Porównanie z branżą │
│  Marża: 42% (śr. 40%)   │
│  Wizyty/dzień: 5.2      │
│  No-show: 8% (śr. 10%)  │
│                         │
│  📊 Trend miesięczny    │
│  [wykres bar chart]     │
│                         │
│  🏆 Ranking usług       │
│  1. Pedicure - 68 zł/h  │
│  2. Manicure - 52 zł/h  │
├─────────────────────────┤
│  [Dashboard][Chat]...   │
└─────────────────────────┘
```

**Elementy dashboardu:**

1. **Sugestia Koly** (na górze)
   - Ikona Sparkles + "Sugestia Koly"
   - Badge z kategorią (Finanse/Marketing/Operacje/Rozwój)
   - Treść sugestii (2-3 zdania)
   - Przycisk odświeżenia
   - Odświeża się tylko gdy zmieniają się dane (cache w localStorage)

2. **Nawigacja po miesiącach**
   - Strzałki lewo/prawo
   - Badge "Teraz" dla bieżącego miesiąca

3. **Główna metryka: ZYSK NETTO**
   - Duża karta w kolorze primary (indigo)
   - Porównanie z poprzednim miesiącem (% zmiana)

4. **Grid statystyk** (2x2):
   - Przychód, Koszty, Wizyty, No-show
   - Każda z ikoną i porównaniem

5. **Cel miesiąca** (jeśli ustawiony)
   - Progress bar z procentem
   - Kwota obecna / cel
   - Ile dziennie potrzeba

6. **Wykres: Trend zysku**
   - Area chart z gradientem (zielony)
   - Dane z daily_snapshots

7. **Porównanie z branżą**
   - Marża zysku (ile % przychodu zostaje jako zysk)
   - Wizyty/dzień
   - No-show rate
   - Każda metryka z opisem i porównaniem do średniej branżowej

8. **Wykres: Trend miesięczny**
   - Bar chart - zysk netto po miesiącach

9. **Ranking usług**
   - Posortowane po zysku na godzinę
   - Progress bar pokazujący udział w przychodzie

10. **Ostrzeżenie o no-show** (jeśli są)
    - Czerwona karta z liczbą i kosztem

### Ekran: Chat z Koly (/app/chat)

Interfejs czatu z AI asystentem:

- **Header**: Avatar Koly + "Koly - Twój asystent finansowy"
- **Quick actions** (przed pierwszą wiadomością):
  - "Ile dziś zarobiłam?"
  - "Ile kosztują mnie no-show?"
  - "Która usługa zarabia najlepiej?"
- **Discover chips**: dodatkowe sugestie pytań
- **Historia rozmów**: Sheet z listą poprzednich sesji
- **Input**: Wielowierszowe pole tekstowe (auto-resize)

### Ekran: Galeria (/app/gallery)

Zarządzanie zdjęciami z realizacji:

- **Filtry**: Wszystkie / Portfolio / Z wizyt
- **Tip**: "Kliknij zdjęcie, aby wygenerować post na social media"
- **Grid zdjęć**: Miniatury z badge'ami (Wizyta, Ma opis)
- **Upload**: Drag & drop lub kliknięcie
- **Detail sheet** (po kliknięciu):
  - Pełne zdjęcie
  - Data, powiązana usługa
  - **Generuj post** - Koly pisze chwytliwy opis na social media
  - Lista wygenerowanych opisów z opcją kopiowania
  - Przycisk usunięcia

### Ekran: Wizyty (/app/visits)

Logowanie wizyt z danego dnia:

- **Selektor daty** z nawigacją
- **Status dnia**: Otwarty (zielony) / Zamknięty (szary z datą)
- **Grid usług**:
  - Ulubione na górze (z gwiazdką)
  - Pozostałe poniżej
  - Badge z liczbą wizyt danego dnia
- **Lista wizyt dnia**:
  - Miniaturka zdjęcia (jeśli dodane) lub ikona statusu
  - Nazwa usługi
  - Cena (przekreślona jeśli no-show)
  - Kliknięcie otwiera edycję
- **Podsumowanie dnia**: Przychód, szacowany zysk
- **Przycisk "Zamknij dzień"**:
  - Tylko dla dni z wizytami
  - Po zamknięciu: obliczenia, snapshot, wizyty read-only
- **Dialog edycji wizyty**:
  - Status (Wykonana/No-show)
  - Cena (możliwość zmiany)
  - Notatka
  - Zdjęcia (upload/usuwanie)

### Ekran: Ustawienia (/app/settings)

- Karta użytkownika (imię, email)
- Lista opcji:
  - Profil (dane osobowe i biznesowe)
  - Koszty stałe (czynsz, media, księgowość)
  - Usługi (cennik i czas trwania)
- Przycisk wylogowania
- Wersja aplikacji

### Design guidelines

- **Kolory**:
  - Primary: Indigo (#312e81)
  - Background: Slate-50 (#f8fafc)
  - Accent: Amber (#fbbf24)
  - Success: Emerald
  - Error: Red
- **Border radius**: Duży (1rem dla kart, rounded-full dla przycisków)
- **Nawigacja mobile**: Floating bar z rounded-2xl, shadow
- **Nawigacja desktop**: Sidebar z bg-primary
- **Karty**: Subtelny cień (shadow-sm), bez wyraźnych borderów
- **Przyciski**: Pill-shaped (rounded-full)
- **Touch targets**: Min 44px
- **Skeleton loaders**: Zamiast spinnerów
- **Font**: System font, responsive sizing
- **Tylko light mode** - brak dark mode

---

## 9. Multi-tenant — izolacja danych

### Zasada

Każdy endpoint API:
1. Wyciąga `user_id` z sesji (NextAuth)
2. Dodaje `WHERE user_id = ?` do każdego query
3. Nigdy nie pozwala na dostęp do danych innego usera



## 10. Deployment (Docker Compose na VPS)

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16
    container_name: AiCostTracker-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=pp_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=AiCostTracker
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U pp_user -d AiCostTracker']
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - internal

  backend:
    build: ./backend
    container_name: AiCostTracker-backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://pp_user:${POSTGRES_PASSWORD}@postgres:5432/AiCostTracker
      - JWT_SECRET=${JWT_SECRET}
      - N8N_WEBHOOK_URL=http://n8n:5678
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - internal

  n8n:
    image: docker.n8n.io/n8nio/n8n
    container_name: AiCostTracker-n8n
    restart: unless-stopped
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=AiCostTracker
      - DB_POSTGRESDB_USER=pp_user
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      - N8N_HOST=${DOMAIN}
      - N8N_PROTOCOL=https
      - N8N_PATH=/n8n/
      - WEBHOOK_URL=https://${DOMAIN}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - GENERIC_TIMEZONE=Europe/Warsaw
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - internal

  frontend:
    build: ./frontend
    container_name: AiCostTracker-frontend
    restart: unless-stopped
    networks:
      - internal

  nginx:
    image: nginx:alpine
    container_name: AiCostTracker-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - backend
      - frontend
      - n8n
    networks:
      - internal

volumes:
  pgdata:
  n8n_data:

networks:
  internal:
    driver: bridge
```

### nginx.conf routing

```
/ → frontend (React SPA)
/api/* → backend (NestJS)
/n8n/* → n8n (panel admina + webhooks)
/webhook/* → n8n (webhooks publiczne)
```

### Ważne: n8n dzieli bazę z NestJS

n8n używa tej samej bazy PostgreSQL co NestJS. n8n potrzebuje
własnych tabel (do zarządzania workflow-ami, credentials etc.),
ale dane aplikacyjne (users, visits, services etc.) czyta
bezpośrednio przez node PostgreSQL w workflow-ach.

Upewnij się że n8n ma READ access do tabel aplikacyjnych
i WRITE access do tabeli ai_reports.

---

## 11. Monetyzacja i pricing

Początkowo aplikacja jest bezpłątna.


---

## 12. Po MVP — roadmapa

### V1.1 (miesiąc 2)
- Import z Google Calendar (automatyczne logowanie wizyt)
- Push notifications (przypomnienie o logowaniu wizyt)
- Porównanie z rynkiem (anonymized crowd data)

### V1.2 (miesiąc 3)
- Multi-pracownik (właścicielka salonu z 2-3 pracownikami)
- Rozliczanie prowizji
- Raporty miesięczne dla księgowej (export PDF)

### V2.0 (miesiąc 4-6)
- Integracja z Booksy (import wizyt)
- Integracja z fakturownia.pl / ifirma
- API dla zewnętrznych integracji
- White-label dla sieci salonów

### Skalowanie poza beauty
- Ten sam produkt, inna landing page i sugestie onboardingowe
- Trenerzy personalni, fizjoterapeuci, fotografowie, tatuażyści
- Każda branża = osobna kampania marketingowa, ten sam produkt

---