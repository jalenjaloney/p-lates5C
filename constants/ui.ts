/**
 * Legacy UI constants - compatibility shim
 * These map old UI constants to new tokens for screens that haven't been migrated yet
 * TODO: Migrate Profile and Social screens to use tokens directly
 */

import { tokens } from './tokens';

export const UI = {
  colors: {
    background: tokens.color.light.background,
    surface: tokens.color.light.surface,
    surfaceMuted: tokens.color.light.surfaceAlt,
    surfaceAlt: tokens.color.light.surfaceAlt,
    border: tokens.color.light.border,
    borderStrong: tokens.color.light.borderStrong,
    ink: tokens.color.light.ink,
    inkSoft: tokens.color.light.inkSoft,
    inkMuted: tokens.color.light.inkMuted,
    accent: tokens.color.light.accent,
    accentBright: tokens.color.light.accentSoft,
    accentWarm: tokens.color.light.accent,
    accentBerry: tokens.color.light.error,
  },
  font: {
    display: tokens.font.display,
    body: tokens.font.body,
  },
  radius: {
    card: tokens.radius.xl,
  },
  shadow: {
    color: '#1A1814',
    offset: { width: 0, height: 4 },
    opacity: 0.08,
    radius: 12,
  },
};
