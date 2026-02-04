/**
 * Dining Hall Operating Hours
 * Hardcoded for MVP - TODO: Fetch dynamically from Bon Appétit API
 */

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner' | 'late_night';

export type HallHours = {
  breakfast?: { start: string; end: string };
  lunch?: { start: string; end: string };
  dinner?: { start: string; end: string };
  late_night?: { start: string; end: string };
};

export type HallSchedule = {
  name: string;
  weekday: HallHours;
  weekend: HallHours;
};

/**
 * Hall schedules (typical operating hours)
 * Times in 24-hour format (HH:MM)
 */
export const HALL_SCHEDULES: Record<string, HallSchedule> = {
  Hoch: {
    name: 'Hoch',
    weekday: {
      breakfast: { start: '07:00', end: '10:00' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
    weekend: {
      breakfast: { start: '08:00', end: '10:30' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
  },
  McConnell: {
    name: 'McConnell',
    weekday: {
      breakfast: { start: '07:00', end: '10:00' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
    weekend: {
      breakfast: { start: '08:00', end: '10:30' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
  },
  Collins: {
    name: 'Collins',
    weekday: {
      breakfast: { start: '07:00', end: '10:00' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
    weekend: {
      breakfast: { start: '08:00', end: '10:30' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
  },
  Malott: {
    name: 'Malott',
    weekday: {
      breakfast: { start: '07:00', end: '10:00' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
    weekend: {
      breakfast: { start: '08:00', end: '10:30' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
  },
  Frary: {
    name: 'Frary',
    weekday: {
      breakfast: { start: '07:00', end: '10:00' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
    weekend: {
      breakfast: { start: '08:00', end: '10:30' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
  },
  Frank: {
    name: 'Frank',
    weekday: {
      breakfast: { start: '07:00', end: '10:00' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
    weekend: {
      breakfast: { start: '08:00', end: '10:30' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '20:00' },
    },
  },
  Oldenborg: {
    name: 'Oldenborg',
    weekday: {
      lunch: { start: '11:30', end: '13:30' },
      dinner: { start: '17:00', end: '19:30' },
    },
    weekend: {
      // Oldenborg typically closed on weekends
    },
  },
};

/**
 * List of all hall names
 */
export const HALL_NAMES = Object.keys(HALL_SCHEDULES);

export const getHallDisplayName = (hallName: string) => hallName;

export const normalizeHallName = (hallName: string) => {
  const raw = (hallName || '').toLowerCase();
  if (raw.includes('hoch')) return 'Hoch';
  if (raw.includes('mcconnell')) return 'McConnell';
  if (raw.includes('collins')) return 'Collins';
  if (raw.includes('malott')) return 'Malott';
  if (raw.includes('frary')) return 'Frary';
  if (raw.includes('frank')) return 'Frank';
  if (raw.includes('oldenborg')) return 'Oldenborg';
  if (raw.includes('scripps')) return 'Scripps';
  return hallName;
};
