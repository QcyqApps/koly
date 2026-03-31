# Review Agent

Automatyczny system analizy aplikacji webowych. Porównuje działającą aplikację ze specyfikacją i generuje raport w Markdown.

## Jak to działa?

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ Specyfikacja │────▶│  review-agent.sh  │────▶│  Raport (.md)     │
│   (.md)      │     │  (orkiestrator)   │     │  w katalogu proj. │
└─────────────┘     └──────────────────┘     └───────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Warstwa  │ │ Warstwa  │ │ Warstwa  │
        │ API      │ │ UI/UX    │ │ Kodu     │
        └──────────┘ └──────────┘ └──────────┘
```

**Trzy warstwy analizy:**
- **API** — testuje endpointy (curl + jq)
- **UI** — screenshoty i flow użytkownika (Playwright)
- **Kod** — statyczna analiza kodu vs specyfikacja (Claude CLI)

## Wymagania

- **Bash** 4+
- **curl** i **jq**
- **Node.js** 18+ (dla warstwy UI)
- **Playwright** — `npm install playwright`
- **Claude CLI** — `npm install -g @anthropic-ai/claude-code`

## Instalacja

```bash
# Sklonuj repozytorium
git clone <repo-url>
cd review-agent

# Nadaj uprawnienia do wykonania
chmod +x review-agent.sh layers/*.sh

# Zainstaluj Playwright (jeśli używasz warstwy UI)
npm install playwright
npx playwright install chromium
```

## Szybki start

### 1. Przygotuj konfigurację

Skopiuj `config.example.json` do katalogu swojego projektu:

```bash
cp config.example.json /ścieżka/do/projektu/config.json
```

### 2. Dostosuj konfigurację

Edytuj `config.json`:

```json
{
  "spec_path": "./SPEC.md",           // Ścieżka do specyfikacji
  "project_root": "./src",            // Katalog z kodem źródłowym
  "base_url": "http://localhost:3000", // URL działającej aplikacji
  "api_base_url": "http://localhost:3000/api",

  "layers": {
    "api": {
      "enabled": true,
      "endpoints": [
        { "method": "GET", "path": "/users", "expect_status": 200 }
      ]
    },
    "ui": {
      "enabled": true,
      "pages": [
        { "path": "/", "name": "Strona główna" }
      ],
      "flows": []
    },
    "code": {
      "enabled": true,
      "include": ["src/**/*.ts"],
      "exclude": ["node_modules"]
    }
  },

  "output": {
    "path": "./REVIEW-REPORT.md"
  }
}
```

### 3. Uruchom aplikację

```bash
cd /ścieżka/do/projektu
npm run dev
```

### 4. Uruchom review

```bash
./review-agent.sh /ścieżka/do/projektu/config.json
```

### 5. Przeczytaj raport

```bash
cat /ścieżka/do/projektu/REVIEW-REPORT.md
```

## Konfiguracja

### Sekcja `layers.api`

| Pole | Opis |
|------|------|
| `enabled` | Włącz/wyłącz warstwę (domyślnie: true) |
| `timeout_ms` | Timeout dla requestów (domyślnie: 5000) |
| `endpoints[]` | Lista endpointów do testowania |

**Endpoint:**
```json
{
  "method": "POST",
  "path": "/api/users",
  "expect_status": 201,
  "body": { "name": "Test" },
  "description": "Tworzenie użytkownika"
}
```

### Sekcja `layers.ui`

| Pole | Opis |
|------|------|
| `enabled` | Włącz/wyłącz warstwę |
| `viewport` | Rozmiar viewportu `{ width, height }` |
| `timeout_ms` | Timeout dla operacji (domyślnie: 30000) |
| `pages[]` | Lista stron do screenshotów |
| `flows[]` | Lista przepływów użytkownika |

**Strona:**
```json
{ "path": "/dashboard", "name": "Dashboard" }
```

**Flow:**
```json
{
  "name": "Logowanie",
  "steps": [
    { "action": "goto", "value": "/login" },
    { "action": "fill", "selector": "#email", "value": "user@test.com" },
    { "action": "fill", "selector": "#password", "value": "password123" },
    { "action": "click", "selector": "button[type=submit]" },
    { "action": "wait", "selector": ".dashboard", "timeout": 5000 }
  ]
}
```

**Dostępne akcje w flow:**
- `goto` — nawigacja do URL
- `fill` — wypełnienie pola
- `click` — kliknięcie elementu
- `wait` — czekanie na element
- `type` — wpisywanie tekstu (znak po znaku)
- `press` — naciśnięcie klawisza
- `select` — wybór z dropdowna
- `screenshot` — zrzut ekranu

### Sekcja `layers.code`

| Pole | Opis |
|------|------|
| `enabled` | Włącz/wyłącz warstwę |
| `include` | Glob patterns plików do analizy |
| `exclude` | Patterns do wykluczenia |

### Sekcja `output`

| Pole | Opis |
|------|------|
| `path` | Ścieżka do raportu końcowego |
| `results_dir` | Katalog na wyniki pośrednie (domyślnie: review-results) |

## Wyłączanie warstw

Jeśli nie potrzebujesz którejś warstwy:

```json
{
  "layers": {
    "api": { "enabled": false },
    "ui": { "enabled": true },
    "code": { "enabled": true }
  }
}
```

## Struktura wyników

```
projekt/
├── config.json
├── SPEC.md
├── REVIEW-REPORT.md          # Raport końcowy
└── review-results/
    ├── api-results.json      # Wyniki testów API
    ├── ui-results.json       # Wyniki testów UI
    ├── code-review.json      # Wyniki code review
    └── screenshots/          # Screenshoty z UI
        ├── page-strona-glowna.png
        ├── page-dashboard.png
        └── flow-logowanie-complete.png
```

## Troubleshooting

### "Aplikacja nie odpowiada"

Upewnij się, że:
1. Aplikacja jest uruchomiona (`npm run dev`)
2. URL w `base_url` jest poprawny
3. Port nie jest blokowany przez firewall

### "Claude CLI not installed"

Zainstaluj Claude CLI:
```bash
npm install -g @anthropic-ai/claude-code
```

### "No source files found"

Sprawdź czy:
1. `project_root` wskazuje na istniejący katalog
2. Patterns w `include` są poprawne
3. Pliki nie są wykluczone przez `exclude`

### Błędy Playwright

```bash
# Zainstaluj przeglądarkę
npx playwright install chromium

# Lub zainstaluj wszystkie przeglądarki
npx playwright install
```

## Rozszerzanie

### Własne prompty

Prompty znajdują się w `prompts/`. Możesz je modyfikować bez zmiany kodu:

- `api-analysis.md` — analiza wyników API
- `ui-analysis.md` — analiza screenshotów
- `code-review.md` — review kodu
- `synthesis.md` — synteza końcowego raportu

### Dodawanie akcji do flow

Edytuj `layers/ui-test.js`, dodając nowy case w switch:

```javascript
case 'custom-action':
    // Twoja logika
    break;
```

## Licencja

MIT
