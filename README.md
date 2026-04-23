# FieldFlicks (Fieldflix)

Expo (React Native) app for iOS and Android, using `expo-router`.

## Setup

1. **Install:** `npm install`
2. **Env:** copy `.env.example` to `.env` and set `EXPO_PUBLIC_BASE_URL` to your API origin (no trailing slash).
3. **Run:** `npx expo start` then open in Expo Go, an emulator, or a development build.

## Android / iOS native folders

`android/` and `ios/` are included for local builds. If you use **EAS Build** only, you can remove them and run `npx expo prebuild` when needed. Build outputs are gitignored (see `.gitignore`).

## This repository

This repo contains **only the mobile app** (no `web/`, no Nest backend). Pair it with your own API or the FieldFlicks backend from your infrastructure.

## Release builds

`EXPO_PUBLIC_*` values are baked in at build time. After changing `.env`, run a new `eas build` or `npx expo run:android` / `run:ios` as appropriate.
