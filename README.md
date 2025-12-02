# 5C Dining Menus — React Native

The web client has been replaced with a React Native app built on Expo so the same Supabase-backed experience is available on iOS, Android, and the Expo web runtime.

## Prerequisites

- Node.js 18+
- npm 9+
- Expo CLI (`npx expo --version` runs automatically, no global install required)
- Supabase project with the `menu_items` and `dishes` tables that the existing backend already exposes

## Environment variables

Create a `.env` file (or copy `env.example`) with the Expo-compatible vars:

```
EXPO_PUBLIC_SUPABASE_URL=your-url-here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

These values are bundled at build-time. Never commit real credentials.

## Install & run

```bash
npm install
npm run start            # opens the Expo dev tools
```

From the Expo dev tools you can press:

- `i` to launch the iOS simulator
- `a` to launch the Android emulator
- `w` to open the Expo web build (Metro handles bundling)

The usual Expo commands are also available:

- `npm run ios`
- `npm run android`
- `npm run web`

## Project layout

- `App.js` — entry point that wires up navigation and auth gating
- `src/context/AuthContext.jsx` — Supabase auth helpers & session state
- `src/screens/*` — React Native screens for landing, auth, dashboard, and dish detail views
- `src/supabaseClient.js` — Supabase client configured for Expo env vars

Existing data tooling (`src/schema.sql`, `src/scraper.js`, `supabase/functions/*`) is unchanged.

## Linting

```bash
npm run lint
```

The ESLint config is shared across the React Native app and the auxiliary Node scripts.*** End Patch
