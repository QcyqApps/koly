Teraz wygeneruję kompletny raport końcowy:

---

# Review Report — ai-review-agent

**Data:** 2026-03-18

## Ocena ogólna: 6.4/10

## Podsumowanie

Aplikacja AiCostTracker posiada solidne fundamenty architektoniczne z dobrze zorganizowanym kodem React/NestJS i przyjaznym interfejsem mobile-first. Główne obawy dotyczą bezpieczeństwa (brak rate limiting, tokeny w localStorage) oraz brakujących kluczowych funkcji (symulator, landing page, integracja Stripe). **Aplikacja nie jest gotowa do produkcji** — wymaga uzupełnienia zabezpieczeń i brakujących modułów przed wdrożeniem.

## Problemy krytyczne 🔴

| # | Warstwa | Problem |
|---|---------|---------|
| 1 | API | Brak rate limiting na endpointach `/auth/login` i `/auth/register` — możliwy atak brute force |
| 2 | API | Endpoint `POST /auth/login` zwraca status 400 zamiast 401 przy braku danych logowania |
| 3 | Kod | Brak walidacji i sanityzacji danych wejściowych — DTOs zawierają tylko podstawowe dekoratory class-validator |
| 4 | Kod | Hardcoded secrets — brak widoczności zarządzania JWT_SECRET i innych sekretów, brak walidacji ich obecności |
| 5 | Kod | Brak rate limiting na poziomie backendu — endpoint auth podatny na brute force |

## Ostrzeżenia 🟡

| # | Warstwa | Problem |
|---|---------|---------|
| 1 | Kod | `useAuthStore` przechowuje tokeny w localStorage — podatność na XSS. Refresh token powinien być w httpOnly cookie |
| 2 | Kod | Brak obsługi błędów sieciowych w mutacjach — np. `uploadMutation` w `gallery.tsx:56` pokazuje tylko generyczny toast |
| 3 | Kod | Brak walidacji rozmiaru i typu plików po stronie backendu — walidacja tylko na froncie |
| 4 | Kod | Query invalidation po usunięciu obrazu może powodować race condition (`gallery.tsx:65`) |
| 5 | Kod | Brak obsługi przypadku gdy n8n webhook jest niedostępny — flow 'Zamknij dzień' może się zawiesić |
| 6 | Kod | `ProtectedRoute` wykonuje zapytanie `/me` przy każdym renderze — brak debounce/throttle |
| 7 | Kod | Brak obsługi concurrent session — użytkownik może być zalogowany na wielu urządzeniach bez wykrywania |

## Sugestie 💡

| # | Warstwa | Sugestia |
|---|---------|----------|
| 1 | Kod | Brak implementacji Symulatora 'Co jeśli' (`/dashboard/simulator`) — wymieniony w specyfikacji |
| 2 | Kod | `QueryClient` retry ustawione na 1 — może być za mało dla niestabilnych połączeń mobilnych (target: stylistki na telefonach) |
| 3 | Kod | Brak implementacji service categories w widoku wizyt — tabela zdefiniowana ale niewykorzystana w UI |

## Szczegóły warstw

### API [8/10]

API jest dobrze zabezpieczone pod względem autoryzacji — wszystkie chronione endpointy poprawnie zwracają 401 dla nieautoryzowanych żądań. Testy wykazały **12/13 testów zaliczonych**.

**Kluczowe problemy:**
- ❌ `POST /auth/login` zwraca 400 zamiast 401 przy pustych danych — niespójność z konwencją HTTP
- ✅ Pozostałe endpointy (`/services`, `/visits`, `/fixed-costs`, `/gallery`, `/dashboard/suggestion`) poprawnie chronione

### UI/UX [9/10]

Interfejs jest przejrzysty, mobile-first, z dobrym designem i polską lokalizacją. Wszystkie testowane strony i flows działają poprawnie (**2/2 stron**, **3/3 flows**).

**Pozytywne aspekty (na podstawie screenshotów):**
- Czytelne formularze logowania i rejestracji (`page-logowanie.png`, `page-rejestracja.png`)
- Dobry feedback wizualny — spinner "Logowanie..." podczas wysyłania formularza (`flow-formularz-logowania-complete.png`)
- Walidacja hasła widoczna dla użytkownika ("Minimum 8 znaków")
- Spójna kolorystyka indigo jako primary
- Nawigacja między stronami działa płynnie

**Brak błędów w konsoli** — żadne JavaScript errors.

### Kod [5/10]

Kod ma dobrą strukturę organizacyjną (React + NestJS + Prisma), ale **poważne braki w bezpieczeństwie** i **niekompletna implementacja funkcji specyfikacji**.

**Kluczowe problemy:**
- 🔴 Tokeny auth w localStorage (podatność XSS) — `frontend/src/store/auth-store.ts`
- 🔴 Brak rate limiting na auth
- 🔴 Brak walidacji plików po stronie backendu
- 🟡 Brak obsługi timeoutu dla n8n webhooks
- 🟡 Race conditions przy operacjach na galerii

## Brakujące funkcje vs specyfikacja

| Funkcja | Status |
|---------|--------|
| Landing page | ❌ Nie zaimplementowane |
| Stripe integration (płatności) | ❌ Nie zaimplementowane |
| Symulator "Co jeśli" (`/dashboard/simulator`) | ❌ Brak route i komponentu |
| n8n workflows (pliki JSON) | ❌ Nie dostarczone |
| Endpoint `POST /api/auth/logout` | ❌ Implementacja niewidoczna |
| Onboarding — predefiniowane sugestie na podstawie branży | ❌ Brak w dostarczonym kodzie |
| Weekly AI reports (cron job w n8n) | ❌ Nie zaimplementowane |
| Goal setting UI (cel miesiąca) | ❌ Dashboard pokazuje progress ale brak UI do ustawiania |

## Rekomendacja

⚠️ **WYMAGA ZNACZĄCYCH ZMIAN** — Poważniejsze problemy do naprawy

**Przed produkcją konieczne:**
1. Implementacja rate limiting na auth endpoints
2. Przeniesienie refresh tokena do httpOnly cookie
3. Dodanie walidacji plików po stronie backendu
4. Naprawienie statusu HTTP dla pustego logowania (400 → 401)
5. Implementacja brakujących funkcji core: symulator, landing page
6. Dostarczenie n8n workflows

---
