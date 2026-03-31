Na podstawie przeanalizowanych wyników wszystkich warstw oraz screenshotów generuję raport końcowy:

---

# Review Report — AiCostTracker

**Data:** 2026-03-18

## Ocena ogólna: 7/10

## Podsumowanie

Aplikacja ma zaimplementowane główne funkcjonalności MVP: autoryzacja JWT, onboarding, CRUD dla usług/kosztów/wizyt, zamykanie dnia z kalkulacją zysku, dashboard z wykresami, chat z AI (Koly) oraz galerię zdjęć. API jest dobrze zabezpieczone (21/21 testów auth przeszło). **Główny bloker produkcyjny to krytyczna podatność XSS w chacie.** Brakuje kilku funkcji ze specyfikacji (symulator "Co jeśli", cofanie zamknięcia dnia). Screenshoty pokazują, że chronione strony wyświetlają skeleton loadery zamiast treści (prawidłowe zachowanie przy braku autoryzacji).

## Problemy krytyczne 🔴

| Warstwa | Problem | Lokalizacja |
|---------|---------|-------------|
| Kod | **XSS vulnerability** — `dangerouslySetInnerHTML` używane na odpowiedziach AI w chacie bez sanityzacji. `formatMessage()` używa regex ale nie escapuje HTML entities, umożliwiając wstrzyknięcie skryptów. | `frontend/src/pages/app/chat.tsx:224` |

## Ostrzeżenia 🟡

| Warstwa | Problem | Lokalizacja |
|---------|---------|-------------|
| Kod | Brak walidacji UUID dla `serviceId` w POST /api/visits — używa `@IsString()` zamiast `@IsUUID()` | `backend/src/visits/dto/create-visit.dto.ts:4` |
| Kod | Rate limiting dla auth endpoints ustawione na 25 req/min (specyfikacja sugeruje 5 req/min) | `backend/src/auth/auth.controller.ts:38` |
| Kod | Timeout 90s dla n8n webhooków w ChatService może blokować wątek zbyt długo | `backend/src/chat/chat.service.ts:97` |
| Kod | Brak limitu liczby plików na użytkownika — potencjalny DoS przez wyczerpanie dysku | `backend/src/upload/upload.service.ts` |
| Kod | Brak walidacji czy `serviceId` istnieje przed utworzeniem wizyty (lepiej zwrócić 404 niż błąd FK) | `backend/src/visits/visits.service.ts:10` |
| UI | Liczne błędy 429 (Too Many Requests) w konsoli — rate limiting może być zbyt agresywny dla normalnego użytkowania | Wszystkie strony chronione |

## Sugestie 💡

| Warstwa | Sugestia | Lokalizacja |
|---------|----------|-------------|
| Kod | Dodać indeks na `gallery_images.created_at` dla efektywnego sortowania przy dużej liczbie zdjęć | `backend/prisma/schema.prisma` |
| Kod | Rozważyć krótszy czas cache dla sugestii Koly (obecnie 24h) lub invalidację przy konkretnych akcjach | `frontend/src/pages/app/dashboard.tsx:51` |
| UI | Strona logowania wygląda profesjonalnie — design zgodny ze specyfikacją (indigo, mobile-first) | `page-logowanie.png` |

## Szczegóły warstw

### API [10/10]

Wszystkie 21 testów API przeszło pomyślnie. Endpointy prawidłowo zwracają:
- **401 Unauthorized** dla żądań bez tokena auth
- **400 Bad Request** dla nieprawidłowych danych rejestracji z czytelnymi komunikatami walidacji po polsku

Kluczowe endpointy przetestowane:
- Auth: `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/me`
- CRUD: `/services`, `/fixed-costs`, `/visits`
- Funkcjonalności: `/day/close`, `/day/benchmark`, `/dashboard/suggestion`
- Pozostałe: `/gallery`, `/chat/send`

Wszystkie chronione endpointy poprawnie wymagają autoryzacji.

### UI/UX [8/10]

**Pozytywne:**
- Wszystkie 7 stron załadowało się poprawnie (load time 536-776ms)
- Oba flow testowe przeszły (publiczne strony + nawigacja po zalogowaniu)
- Strona logowania (`page-logowanie.png`) ma czysty design: formularz email/hasło, przycisk indigo, link do rejestracji
- Mobile-first layout zgodny ze specyfikacją

**Problematyczne:**
- Screenshoty stron chronionych (`page-dashboard.png`, `page-chat-z-koly.png`, `page-wizyty.png`, `page-galeria.png`, `page-ustawienia.png`) pokazują skeleton loadery — prawdopodobnie brak danych testowych lub przekierowanie na login
- 35 błędów konsoli (401 i 429) — rate limiting może być zbyt restrykcyjny
- Błędy 429 pojawiają się przy normalnej nawigacji co sugeruje potrzebę dostrojenia limitów

### Kod [7/10]

**Architektura:**
- NestJS + Prisma na backendzie ✅
- React + TanStack Query na froncie ✅
- Poprawna izolacja multi-tenant (user_id w każdym zapytaniu)

**Zaimplementowane funkcje:**
- ✅ Auth z JWT + cookies
- ✅ Onboarding 3-krokowy
- ✅ CRUD dla usług/kosztów/wizyt
- ✅ Zamykanie dnia z kalkulacją zysku
- ✅ Dashboard z wykresami i sugestiami AI
- ✅ Chat z Koly (AI asystent)
- ✅ Galeria z generowaniem postów

**Problemy bezpieczeństwa:**
- 🔴 XSS w chacie (krytyczne)
- 🟡 Brak walidacji UUID
- 🟡 Rate limiting niezgodny ze specyfikacją

## Brakujące funkcje vs specyfikacja

| Funkcja | Status | Priorytet |
|---------|--------|-----------|
| Symulator "Co jeśli" (`/dashboard/simulator`) | ❌ Brak | Wysoki — kluczowa funkcja ze specyfikacji |
| Cofnięcie zamknięcia dnia | ❌ Brak | Średni — opcja naprawy pomyłek |
| Wiadomość powitalna w chacie (pierwsza wiadomość danego dnia) | ❌ Brak | Niski |
| Landing page | ❌ Brak | Niski (MVP) |
| Endpoint `PATCH /api/users/onboarding` | ❌ Używany `PATCH /api/users/me` | Niski — działa alternatywnie |

## Rekomendacja

⚠️ **WYMAGA ZNACZĄCYCH ZMIAN** — Poważniejsze problemy

**Przed wdrożeniem produkcyjnym należy:**

1. **Krytyczne:** Naprawić XSS w chacie — użyć biblioteki do sanityzacji HTML (np. DOMPurify) lub zamienić `dangerouslySetInnerHTML` na bezpieczny rendering
2. **Ważne:** Dodać walidację `@IsUUID()` dla serviceId
3. **Ważne:** Dostroić rate limiting — zbyt agresywny przy normalnym użytkowaniu
4. **Rekomendowane:** Zaimplementować symulator "Co jeśli" (ważna funkcja biznesowa)
5. **Rekomendowane:** Dodać opcję cofnięcia zamknięcia dnia

---
