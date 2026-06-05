// Date helpers shared across the app. Dates are stored as ISO "YYYY-MM-DD"
// strings (local calendar day, no time component).

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

// Result of natural-language date extraction.
export interface ExtractedDate {
  iso: string | null;
  cleanedText: string;
}

// Format a Date as a local "YYYY-MM-DD" string.
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

// Parse an ISO date string into a local Date (midnight local time).
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Human-friendly label, e.g. "Today", "Tomorrow", or "Mon, Jun 5".
export function formatDateLabel(iso: string): string {
  if (!iso) return "";
  const date = fromISODate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Best-effort natural-language date extraction used by the on-device fallback
// parser. Returns { iso, cleanedText } where cleanedText has the matched date
// phrase removed. iso is null when no date phrase is found.
export function extractDate(text: string, lang: string = "en"): ExtractedDate {
  const lower = text.toLowerCase();
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  const make = (offsetDays: number): string => {
    const d = new Date(base);
    d.setDate(d.getDate() + offsetDays);
    return toISODate(d);
  };

  // Helper to remove a matched substring (case-insensitive) and tidy whitespace.
  const strip = (original: string, matched: string): string => {
    const idx = original.toLowerCase().indexOf(matched.toLowerCase());
    if (idx === -1) return original;
    const cleaned =
      original.slice(0, idx) + original.slice(idx + matched.length);
    return cleaned.replace(/\s{2,}/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
  };

  // Days-of-week math: days ahead `target` (0=Sun) is from today.
  const weekdayDiff = (target: number, isNext: boolean): number => {
    let diff = (target - base.getDay() + 7) % 7;
    if (diff === 0) diff = 7; // a named weekday means the upcoming one
    if (isNext) diff += 7;
    return diff;
  };

  // Try an ordered list of relative-day phrases (compound forms must come
  // first, e.g. "prekosutra" before "sutra"). Returns null if none match.
  const matchRelative = (list: [string, number][]): ExtractedDate | null => {
    for (const [word, offset] of list) {
      if (lower.includes(word)) {
        return { iso: make(offset), cleanedText: strip(text, word) };
      }
    }
    return null;
  };

  // ---------------- Croatian ----------------
  if (lang === "hr") {
    const rel = matchRelative([
      ["prekosutra", 2],
      ["sutra", 1],
      ["danas", 0],
      ["večeras", 0],
      ["veceras", 0],
      ["jučer", -1],
      ["jucer", -1],
    ]);
    if (rel) return rel;

    const zaMatch = lower.match(/\bza (\d+) (dan|dana|tjedan|tjedana|tjedna)\b/);
    if (zaMatch) {
      const mult = zaMatch[2].startsWith("tjed") ? 7 : 1;
      return {
        iso: make(parseInt(zaMatch[1], 10) * mult),
        cleanedText: strip(text, zaMatch[0]),
      };
    }

    const hrDays: [RegExp, number][] = [
      [/\b(?:u )?ponedjeljak/, 1],
      [/\b(?:u )?utorak/, 2],
      [/\b(?:u )?srijed[au]/, 3],
      [/\b(?:u )?(?:č|c)etvrtak/, 4],
      [/\b(?:u )?petak/, 5],
      [/\b(?:u )?subot[au]/, 6],
      [/\b(?:u )?nedjelj[au]/, 0],
    ];
    const hrNext = lower.match(/\b(sljedeći|sljedeci|idući|iduci)\b/);
    for (const [re, target] of hrDays) {
      const m = lower.match(re);
      if (m) {
        let cleaned = strip(text, m[0]);
        if (hrNext) cleaned = strip(cleaned, hrNext[0]);
        return { iso: make(weekdayDiff(target, !!hrNext)), cleanedText: cleaned };
      }
    }
    return { iso: null, cleanedText: text };
  }

  // ---------------- German ----------------
  if (lang === "de") {
    const rel = matchRelative([
      ["übermorgen", 2],
      ["ubermorgen", 2],
      ["vorgestern", -2],
      ["heute abend", 0],
      ["heute", 0],
      ["morgen", 1],
      ["gestern", -1],
    ]);
    if (rel) return rel;

    const inMatch = lower.match(/\bin (\d+) (tagen|tage|tag|wochen|woche)\b/);
    if (inMatch) {
      const mult = inMatch[2].startsWith("woche") ? 7 : 1;
      return {
        iso: make(parseInt(inMatch[1], 10) * mult),
        cleanedText: strip(text, inMatch[0]),
      };
    }

    const pfx = "\\b(?:am |nächsten |nachsten |kommenden )?";
    const deDays: [RegExp, number][] = [
      [new RegExp(pfx + "montag(?![a-zà-ÿ])"), 1],
      [new RegExp(pfx + "dienstag(?![a-zà-ÿ])"), 2],
      [new RegExp(pfx + "mittwoch(?![a-zà-ÿ])"), 3],
      [new RegExp(pfx + "donnerstag(?![a-zà-ÿ])"), 4],
      [new RegExp(pfx + "freitag(?![a-zà-ÿ])"), 5],
      [new RegExp(pfx + "(?:samstag|sonnabend)(?![a-zà-ÿ])"), 6],
      [new RegExp(pfx + "sonntag(?![a-zà-ÿ])"), 0],
    ];
    for (const [re, target] of deDays) {
      const m = lower.match(re);
      if (m) {
        const isNext = /nächst|nachst|kommend/.test(m[0]);
        return { iso: make(weekdayDiff(target, isNext)), cleanedText: strip(text, m[0]) };
      }
    }
    return { iso: null, cleanedText: text };
  }

  // ---------------- Italian ----------------
  if (lang === "it") {
    const rel = matchRelative([
      ["dopodomani", 2],
      ["l'altro ieri", -2],
      ["altro ieri", -2],
      ["domani", 1],
      ["stasera", 0],
      ["oggi", 0],
      ["ieri", -1],
    ]);
    if (rel) return rel;

    const inMatch = lower.match(/\b(?:tra|fra) (\d+) (giorni|giorno|settimane|settimana)\b/);
    if (inMatch) {
      const mult = inMatch[2].startsWith("settiman") ? 7 : 1;
      return {
        iso: make(parseInt(inMatch[1], 10) * mult),
        cleanedText: strip(text, inMatch[0]),
      };
    }

    const pfx = "\\b(?:di |questo |prossimo |prossima )?";
    const itDays: [RegExp, number][] = [
      [new RegExp(pfx + "luned[ìi](?![a-zà-ÿ])"), 1],
      [new RegExp(pfx + "marted[ìi](?![a-zà-ÿ])"), 2],
      [new RegExp(pfx + "mercoled[ìi](?![a-zà-ÿ])"), 3],
      [new RegExp(pfx + "gioved[ìi](?![a-zà-ÿ])"), 4],
      [new RegExp(pfx + "venerd[ìi](?![a-zà-ÿ])"), 5],
      [new RegExp(pfx + "sabato(?![a-zà-ÿ])"), 6],
      [new RegExp(pfx + "domenica(?![a-zà-ÿ])"), 0],
    ];
    for (const [re, target] of itDays) {
      const m = lower.match(re);
      if (m) {
        const isNext = /prossim/.test(m[0]);
        return { iso: make(weekdayDiff(target, isNext)), cleanedText: strip(text, m[0]) };
      }
    }
    return { iso: null, cleanedText: text };
  }

  // ---------------- Spanish ----------------
  if (lang === "es") {
    const rel = matchRelative([
      ["pasado mañana", 2],
      ["pasado manana", 2],
      ["anteayer", -2],
      ["antier", -2],
      ["esta noche", 0],
      ["mañana", 1],
      ["manana", 1],
      ["hoy", 0],
      ["ayer", -1],
    ]);
    if (rel) return rel;

    const inMatch = lower.match(/\ben (\d+) (d[íi]as?|semanas?)\b/);
    if (inMatch) {
      const mult = inMatch[2].startsWith("seman") ? 7 : 1;
      return {
        iso: make(parseInt(inMatch[1], 10) * mult),
        cleanedText: strip(text, inMatch[0]),
      };
    }

    const pfx = "\\b(?:el |próximo |proximo |este )?";
    const esDays: [RegExp, number][] = [
      [new RegExp(pfx + "lunes(?![a-zà-ÿ])"), 1],
      [new RegExp(pfx + "martes(?![a-zà-ÿ])"), 2],
      [new RegExp(pfx + "(?:miércoles|miercoles)(?![a-zà-ÿ])"), 3],
      [new RegExp(pfx + "jueves(?![a-zà-ÿ])"), 4],
      [new RegExp(pfx + "viernes(?![a-zà-ÿ])"), 5],
      [new RegExp(pfx + "(?:sábado|sabado)(?![a-zà-ÿ])"), 6],
      [new RegExp(pfx + "domingo(?![a-zà-ÿ])"), 0],
    ];
    const queViene = lower.includes("que viene");
    for (const [re, target] of esDays) {
      const m = lower.match(re);
      if (m) {
        const isNext = /próxim|proxim/.test(m[0]) || queViene;
        let cleaned = strip(text, m[0]);
        if (queViene) cleaned = strip(cleaned, "que viene");
        return { iso: make(weekdayDiff(target, isNext)), cleanedText: cleaned };
      }
    }
    return { iso: null, cleanedText: text };
  }

  // ---------------- English (default) ----------------
  const enRel = matchRelative([
    ["today", 0],
    ["tonight", 0],
    ["tomorrow", 1],
    ["yesterday", -1],
  ]);
  if (enRel) return enRel;

  const inMatch = lower.match(/\bin (\d+) (day|days|week|weeks)\b/);
  if (inMatch) {
    const mult = inMatch[2].startsWith("week") ? 7 : 1;
    return {
      iso: make(parseInt(inMatch[1], 10) * mult),
      cleanedText: strip(text, inMatch[0]),
    };
  }

  const dayMatch = lower.match(
    /\b(next |this |on )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/
  );
  if (dayMatch) {
    const target = WEEKDAYS.indexOf(dayMatch[2]);
    const isNext = dayMatch[1]?.trim() === "next";
    return { iso: make(weekdayDiff(target, isNext)), cleanedText: strip(text, dayMatch[0]) };
  }

  const monthDay = lower.match(
    /\b(?:on )?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/
  );
  if (monthDay) {
    const month = MONTHS.indexOf(monthDay[1]);
    const day = parseInt(monthDay[2], 10);
    let year = base.getFullYear();
    if (new Date(year, month, day) < base) year += 1; // next occurrence
    return {
      iso: toISODate(new Date(year, month, day)),
      cleanedText: strip(text, monthDay[0]),
    };
  }

  return { iso: null, cleanedText: text };
}
