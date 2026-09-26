/**
 * Production-grade Date & Time Resolver with Timezone Awareness
 * Resolves natural language date/time expressions relative to current business timezone.
 */

export interface ResolvedDateTime {
  isValid: boolean;
  isAmbiguous: boolean;
  clarificationQuestion?: string;
  jsDate: Date | null; // UTC Date object ready for DB persistence
  calendarDate: string; // YYYY-MM-DD in local timezone
  timeString: string; // HH:mm in local timezone (24h)
  displayString: string; // e.g. "tomorrow at 10:30 AM"
  displayFull: string; // e.g. "Sunday, 27 September 2026 at 10:30 AM"
  timezone: string;
  isCorrection?: boolean;
}

const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

export class DateTimeResolver {
  /**
   * Resolve customer date/time input in business timezone context
   */
  public resolve(
    input: string,
    options?: {
      referenceDate?: Date;
      timezone?: string;
      existingScheduledDate?: Date | null;
      existingTimeString?: string | null;
    }
  ): ResolvedDateTime {
    const timezone = options?.timezone || DEFAULT_TIMEZONE;
    const refDate = options?.referenceDate || new Date();
    const rawText = input.trim();
    const textLower = rawText.toLowerCase();

    // 1. Get current local date/time parts in the specified timezone
    const nowParts = this.getZonedParts(refDate, timezone);

    // 2. Check for Day Correction (e.g. "I said tomorrow", "No, I meant tomorrow", "Not today, tomorrow")
    const isCorrectionPhrase =
      /\b(i said|i meant|meant|not today|actually|instead of today|maine kal bola|kal bola tha|kal bola)\b/i.test(
        textLower
      );

    const mentionsTomorrow = /\b(tomorrow|tommorow|tomorow|tomo|kal|next day)\b/i.test(textLower);
    const mentionsToday = /\b(today|aaj|tonight)\b/i.test(textLower) && !/\b(not today|not aaj)\b/i.test(textLower);
    const mentionsDayAfter = /\b(day after tomorrow|parso|parson)\b/i.test(textLower);

    // 3. Extract time components (hours, minutes, period)
    const timeExtraction = this.parseTimeComponents(rawText, nowParts, textLower);

    // 4. Handle correction when customer only specifies the day (e.g., "I said tomorrow")
    if ((isCorrectionPhrase || mentionsTomorrow) && !timeExtraction.hasExplicitTime) {
      if (options?.existingScheduledDate || options?.existingTimeString) {
        // Reuse previously agreed time, but shift calendar day
        const prevParts = options.existingScheduledDate
          ? this.getZonedParts(options.existingScheduledDate, timezone)
          : null;

        const targetHour = prevParts ? prevParts.hour : timeExtraction.hour ?? 18;
        const targetMin = prevParts ? prevParts.minute : timeExtraction.minute ?? 0;

        let targetDayOffset = 1; // tomorrow
        if (mentionsDayAfter) targetDayOffset = 2;
        if (mentionsToday) targetDayOffset = 0;

        const targetCalendarDate = this.addDays(nowParts, targetDayOffset);
        const jsDate = this.constructUtcDate(targetCalendarDate, targetHour, targetMin, timezone);

        const timeStr12 = this.format12Hour(targetHour, targetMin);
        const dayWord = targetDayOffset === 1 ? 'tomorrow' : targetDayOffset === 0 ? 'today' : 'the day after tomorrow';

        return {
          isValid: true,
          isAmbiguous: false,
          jsDate,
          calendarDate: `${targetCalendarDate.year}-${String(targetCalendarDate.month).padStart(2, '0')}-${String(targetCalendarDate.day).padStart(2, '0')}`,
          timeString: `${String(targetHour).padStart(2, '0')}:${String(targetMin).padStart(2, '0')}`,
          displayString: `${dayWord} at ${timeStr12}`,
          displayFull: this.formatFullDisplay(jsDate, timezone),
          timezone,
          isCorrection: true,
        };
      }
    }

    // 5. If purely relative minutes/hours (e.g. "in half an hour", "in 30 mins", "after 1 hour")
    if (timeExtraction.isRelativeOffset) {
      const targetDate = new Date(refDate.getTime() + timeExtraction.offsetMinutes * 60 * 1000);
      const targetParts = this.getZonedParts(targetDate, timezone);

      return {
        isValid: true,
        isAmbiguous: false,
        jsDate: targetDate,
        calendarDate: `${targetParts.year}-${String(targetParts.month).padStart(2, '0')}-${String(targetParts.day).padStart(2, '0')}`,
        timeString: `${String(targetParts.hour).padStart(2, '0')}:${String(targetParts.minute).padStart(2, '0')}`,
        displayString: timeExtraction.relativeDisplay || 'in half an hour',
        displayFull: this.formatFullDisplay(targetDate, timezone),
        timezone,
      };
    }

    // 6. Explicit time or period of day
    if (timeExtraction.hasExplicitTime || timeExtraction.hasPeriodOfDay) {
      let hour = timeExtraction.hour ?? 18;
      let min = timeExtraction.minute ?? 0;

      // Determine day offset (0 = today, 1 = tomorrow, 2 = day after)
      let dayOffset = 0;
      if (mentionsTomorrow) {
        dayOffset = 1;
      } else if (mentionsDayAfter) {
        dayOffset = 2;
      } else if (!mentionsToday) {
        // Customer did not specify today or tomorrow explicitly
        // If specified time has already passed today in this timezone, roll to tomorrow
        const currentTotalMinutes = nowParts.hour * 60 + nowParts.minute;
        const requestedTotalMinutes = hour * 60 + min;

        // Give a 15-minute buffer: if time is past, schedule for tomorrow
        if (requestedTotalMinutes <= currentTotalMinutes + 15) {
          dayOffset = 1;
        }
      }

      const targetCalendarDate = this.addDays(nowParts, dayOffset);
      const jsDate = this.constructUtcDate(targetCalendarDate, hour, min, timezone);

      const timeStr12 = this.format12Hour(hour, min);
      const dayWord = dayOffset === 1 ? 'tomorrow' : dayOffset === 0 ? 'today' : 'the scheduled day';

      return {
        isValid: true,
        isAmbiguous: false,
        jsDate,
        calendarDate: `${targetCalendarDate.year}-${String(targetCalendarDate.month).padStart(2, '0')}-${String(targetCalendarDate.day).padStart(2, '0')}`,
        timeString: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        displayString: `${dayWord} at ${timeStr12}`,
        displayFull: this.formatFullDisplay(jsDate, timezone),
        timezone,
        isCorrection: isCorrectionPhrase,
      };
    }

    // Unresolved or non-time input
    return {
      isValid: false,
      isAmbiguous: false,
      jsDate: null,
      calendarDate: '',
      timeString: '',
      displayString: '',
      displayFull: '',
      timezone,
    };
  }

  /**
   * Helper: Parse time components from text
   */
  private parseTimeComponents(
    text: string,
    nowParts: { hour: number; minute: number },
    textLower: string
  ): {
    hasExplicitTime: boolean;
    hasPeriodOfDay: boolean;
    isRelativeOffset: boolean;
    offsetMinutes: number;
    relativeDisplay?: string;
    hour?: number;
    minute?: number;
  } {
    // Relative: half an hour / 30 mins
    if (/\b(half(?:\s+an)?\s*(?:hour|hr)|halfhour|1\/2\s*hour|aadhe?\s*ghante?|adha\s*ghanta)\b/i.test(text)) {
      return {
        hasExplicitTime: true,
        hasPeriodOfDay: false,
        isRelativeOffset: true,
        offsetMinutes: 30,
        relativeDisplay: 'in half an hour',
      };
    }

    // Relative minutes: "in 15 mins", "after 45 minutes"
    const minsMatch = text.match(/\b(?:in|after)?\s*(\d{1,2})\s*(?:mins?|minutes?|min)\b/i);
    if (minsMatch) {
      const m = parseInt(minsMatch[1], 10);
      return {
        hasExplicitTime: true,
        hasPeriodOfDay: false,
        isRelativeOffset: true,
        offsetMinutes: m,
        relativeDisplay: `in ${m} minutes`,
      };
    }

    // Relative hours: "in 2 hours", "after 1 hour"
    const hoursMatch = text.match(/\b(?:in|after)?\s*(\d{1,2})\s*(?:hours?|hrs?|ghante?)\b/i);
    if (hoursMatch) {
      const h = parseInt(hoursMatch[1], 10);
      return {
        hasExplicitTime: true,
        hasPeriodOfDay: false,
        isRelativeOffset: true,
        offsetMinutes: h * 60,
        relativeDisplay: `in ${h} ${h === 1 ? 'hour' : 'hours'}`,
      };
    }

    // Explicit clock time: e.g. "10:30 pm", "7:00 PM", "6:30", "11am", "10:30", "10:30 tomorrow mornig"
    const clockMatch = text.match(/\b([0-1]?[0-9]|2[0-3])(?::([0-5][0-9]))?\s*(am|pm|baje)?\b/i);
    if (clockMatch && (clockMatch[2] !== undefined || clockMatch[3] !== undefined || /\d{1,2}:\d{2}/.test(text))) {
      let rawH = parseInt(clockMatch[1], 10);
      const min = clockMatch[2] ? parseInt(clockMatch[2], 10) : 0;
      const meridiem = (clockMatch[3] || '').toLowerCase();

      // Check if night/evening was mentioned (including typos like 'evning')
      const isEveningNight = /\b(pm|evening|evning|night|shaam|raat)\b/i.test(textLower);
      // Check if morning was mentioned (including typos like 'mornig')
      const isMorning = /\b(am|morning|mornig|subah)\b/i.test(textLower);

      if (meridiem === 'pm' || isEveningNight) {
        if (rawH < 12) rawH += 12;
      } else if (meridiem === 'am' || isMorning) {
        if (rawH === 12) rawH = 0;
      }

      return {
        hasExplicitTime: true,
        hasPeriodOfDay: false,
        isRelativeOffset: false,
        offsetMinutes: 0,
        hour: rawH,
        minute: min,
      };
    }

    // Period of day without clock time: "morning", "afternoon", "evening", "tonight"
    if (/\b(morning|mornig|subah)\b/i.test(textLower)) {
      return { hasExplicitTime: false, hasPeriodOfDay: true, isRelativeOffset: false, offsetMinutes: 0, hour: 10, minute: 0 };
    }
    if (/\b(afternoon|dopahar)\b/i.test(textLower)) {
      return { hasExplicitTime: false, hasPeriodOfDay: true, isRelativeOffset: false, offsetMinutes: 0, hour: 14, minute: 0 };
    }
    if (/\b(evening|evning|shaam|sham)\b/i.test(textLower)) {
      return { hasExplicitTime: false, hasPeriodOfDay: true, isRelativeOffset: false, offsetMinutes: 0, hour: 18, minute: 30 };
    }
    if (/\b(tonight|raat)\b/i.test(textLower)) {
      return { hasExplicitTime: false, hasPeriodOfDay: true, isRelativeOffset: false, offsetMinutes: 0, hour: 20, minute: 0 };
    }

    return {
      hasExplicitTime: false,
      hasPeriodOfDay: false,
      isRelativeOffset: false,
      offsetMinutes: 0,
    };
  }

  /**
   * Helper: Get date parts in target timezone
   */
  public getZonedParts(
    date: Date,
    timeZone: string
  ): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  } {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => {
      const found = parts.find((p) => p.type === type);
      return found ? parseInt(found.value, 10) : 0;
    };

    return {
      year: getPart('year'),
      month: getPart('month'),
      day: getPart('day'),
      hour: getPart('hour') === 24 ? 0 : getPart('hour'),
      minute: getPart('minute'),
      second: getPart('second'),
    };
  }

  /**
   * Helper: Add calendar days
   */
  private addDays(
    parts: { year: number; month: number; day: number },
    daysToAdd: number
  ): { year: number; month: number; day: number } {
    const tempUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysToAdd));
    return {
      year: tempUtc.getUTCFullYear(),
      month: tempUtc.getUTCMonth() + 1,
      day: tempUtc.getUTCDate(),
    };
  }

  /**
   * Helper: Construct accurate UTC Date from local calendar date + time in timezone
   */
  public constructUtcDate(
    calendar: { year: number; month: number; day: number },
    hour: number,
    minute: number,
    timeZone: string
  ): Date {
    let guessUtc = new Date(Date.UTC(calendar.year, calendar.month - 1, calendar.day, hour, minute, 0, 0));

    for (let i = 0; i < 3; i++) {
      const zoned = this.getZonedParts(guessUtc, timeZone);
      const diffMs =
        (Date.UTC(calendar.year, calendar.month - 1, calendar.day, hour, minute) -
          Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute)) %
        (24 * 3600 * 1000);

      if (diffMs === 0) break;
      guessUtc = new Date(guessUtc.getTime() + diffMs);
    }

    return guessUtc;
  }

  /**
   * Helper: Format 12-hour time string
   */
  public format12Hour(hour: number, minute: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const minStr = `:${String(minute).padStart(2, '0')}`;
    return `${h12}${minStr} ${period}`;
  }

  /**
   * Helper: Full display string e.g. "Sunday, 27 September 2026 at 10:30 PM"
   */
  public formatFullDisplay(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }
}

export const dateTimeResolver = new DateTimeResolver();
export default dateTimeResolver;
