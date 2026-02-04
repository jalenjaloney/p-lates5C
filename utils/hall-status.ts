/**
 * Hall Status Detection Logic
 * Determines if a hall is open, closed, or closing soon
 */

import { HALL_SCHEDULES, MealPeriod } from '../constants/hall-hours';

export type HallStatus = 'open' | 'closed' | 'closing-soon';

export type HallStatusInfo = {
  status: HallStatus;
  currentMeal: MealPeriod | null;
  nextMeal: {
    meal: MealPeriod;
    startsAt: string;
  } | null;
  closesAt: string | null;
};

/**
 * Parse time string (HH:MM) into minutes since midnight
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if current time is within a meal period
 */
function isWithinPeriod(now: number, start: string, end: string): boolean {
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  return now >= startMinutes && now <= endMinutes;
}

/**
 * Check if current time is within "closing soon" window (last 30 minutes)
 */
function isClosingSoon(now: number, end: string): boolean {
  const endMinutes = parseTime(end);
  const thirtyMinsBefore = endMinutes - 30;
  return now >= thirtyMinsBefore && now <= endMinutes;
}

/**
 * Get current meal period for a hall
 */
function getCurrentMeal(hallName: string, now: Date): { meal: MealPeriod; end: string } | null {
  const schedule = HALL_SCHEDULES[hallName];
  if (!schedule) return null;

  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  const hours = isWeekend ? schedule.weekend : schedule.weekday;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check each meal period
  const mealOrder: MealPeriod[] = ['breakfast', 'lunch', 'dinner', 'late_night'];
  for (const meal of mealOrder) {
    const period = hours[meal];
    if (period && isWithinPeriod(currentMinutes, period.start, period.end)) {
      return { meal, end: period.end };
    }
  }

  return null;
}

/**
 * Get next meal period for a hall
 */
function getNextMeal(hallName: string, now: Date): { meal: MealPeriod; startsAt: string } | null {
  const schedule = HALL_SCHEDULES[hallName];
  if (!schedule) return null;

  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const hours = isWeekend ? schedule.weekend : schedule.weekday;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check each meal period in order
  const mealOrder: MealPeriod[] = ['breakfast', 'lunch', 'dinner', 'late_night'];
  for (const meal of mealOrder) {
    const period = hours[meal];
    if (period && parseTime(period.start) > currentMinutes) {
      return { meal, startsAt: period.start };
    }
  }

  return null;
}

/**
 * Get status info for a dining hall
 */
export function getHallStatus(hallName: string, now: Date = new Date()): HallStatusInfo {
  const currentMeal = getCurrentMeal(hallName, now);

  if (currentMeal) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isClosing = isClosingSoon(currentMinutes, currentMeal.end);

    return {
      status: isClosing ? 'closing-soon' : 'open',
      currentMeal: currentMeal.meal,
      nextMeal: null,
      closesAt: currentMeal.end,
    };
  }

  // Hall is closed, find next meal
  const nextMeal = getNextMeal(hallName, now);

  return {
    status: 'closed',
    currentMeal: null,
    nextMeal,
    closesAt: null,
  };
}

/**
 * Get status label for display
 */
export function getStatusLabel(statusInfo: HallStatusInfo): string {
  switch (statusInfo.status) {
    case 'open':
      return `OPEN NOW`;
    case 'closing-soon':
      return `CLOSING SOON`;
    case 'closed':
      if (statusInfo.nextMeal) {
        return `CLOSED · OPENS ${statusInfo.nextMeal.startsAt}`;
      }
      return 'CLOSED';
  }
}

/**
 * Get current meal period label
 */
export function getMealLabel(meal: MealPeriod | null): string {
  if (!meal) return '';
  const labels: Record<MealPeriod, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    late_night: 'Late Night',
  };
  return labels[meal];
}

/**
 * Format time for display (HH:MM -> H:MMam/pm)
 */
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
}
