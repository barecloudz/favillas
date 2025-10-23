/**
 * Utility functions for store hours validation
 */

export interface StoreHoursData {
  dayOfWeek: number;
  dayName: string;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  isBreakTime: boolean;
  breakStartTime: string | null;
  breakEndTime: string | null;
}

export interface StoreStatusResult {
  isOpen: boolean;
  isPastCutoff: boolean;
  message: string;
  currentTime: string;
  storeHours: StoreHoursData | null;
  minutesUntilClose?: number;
}

const CUTOFF_MINUTES_BEFORE_CLOSE = 30;

/**
 * Converts a time string (e.g., "20:00") to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Gets the current time in EST/EDT
 */
function getCurrentEasternTime(): Date {
  // Convert to Eastern Time (handles both EST and EDT automatically)
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}

/**
 * Formats a Date object to HH:MM format
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Checks if the store is currently open and if we're past the order cutoff time
 * @param storeHours - Array of store hours for all days
 * @returns Store status including whether we're past the cutoff time
 */
export function checkStoreStatus(storeHours: StoreHoursData[]): StoreStatusResult {
  const now = getCurrentEasternTime();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = formatTime(now);
  const currentMinutes = timeToMinutes(currentTime);

  // Find today's hours
  const todayHours = storeHours.find(h => h.dayOfWeek === currentDay);

  if (!todayHours) {
    return {
      isOpen: false,
      isPastCutoff: true,
      message: 'Store hours not configured',
      currentTime,
      storeHours: null
    };
  }

  // Check if store is marked as closed for the day
  if (!todayHours.isOpen) {
    return {
      isOpen: false,
      isPastCutoff: true,
      message: 'We are closed today',
      currentTime,
      storeHours: todayHours
    };
  }

  // Validate that we have open/close times
  if (!todayHours.openTime || !todayHours.closeTime) {
    return {
      isOpen: false,
      isPastCutoff: true,
      message: 'Store hours not properly configured',
      currentTime,
      storeHours: todayHours
    };
  }

  const openMinutes = timeToMinutes(todayHours.openTime);
  const closeMinutes = timeToMinutes(todayHours.closeTime);

  // Check if we're before opening time
  if (currentMinutes < openMinutes) {
    const minutesUntilOpen = openMinutes - currentMinutes;
    const hours = Math.floor(minutesUntilOpen / 60);
    const mins = minutesUntilOpen % 60;
    const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`;

    return {
      isOpen: false,
      isPastCutoff: true,
      message: `We open at ${todayHours.openTime} (in ${timeString})`,
      currentTime,
      storeHours: todayHours
    };
  }

  // Check if we're after closing time
  if (currentMinutes >= closeMinutes) {
    return {
      isOpen: false,
      isPastCutoff: true,
      message: `We are closed for the day (closed at ${todayHours.closeTime})`,
      currentTime,
      storeHours: todayHours
    };
  }

  // Check if we're during break time
  if (todayHours.isBreakTime && todayHours.breakStartTime && todayHours.breakEndTime) {
    const breakStartMinutes = timeToMinutes(todayHours.breakStartTime);
    const breakEndMinutes = timeToMinutes(todayHours.breakEndTime);

    if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
      return {
        isOpen: false,
        isPastCutoff: true,
        message: `We are currently on break. We'll reopen at ${todayHours.breakEndTime}`,
        currentTime,
        storeHours: todayHours
      };
    }
  }

  // Store is open - now check if we're past the cutoff time
  const cutoffMinutes = closeMinutes - CUTOFF_MINUTES_BEFORE_CLOSE;
  const minutesUntilClose = closeMinutes - currentMinutes;

  if (currentMinutes >= cutoffMinutes) {
    return {
      isOpen: true,
      isPastCutoff: true,
      message: `ASAP orders have ended for the day. We stop taking new orders ${CUTOFF_MINUTES_BEFORE_CLOSE} minutes before closing to ensure quality service.`,
      currentTime,
      storeHours: todayHours,
      minutesUntilClose
    };
  }

  // Store is open and accepting orders
  return {
    isOpen: true,
    isPastCutoff: false,
    message: 'Store is open and accepting orders',
    currentTime,
    storeHours: todayHours,
    minutesUntilClose
  };
}
