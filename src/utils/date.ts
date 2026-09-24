export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

interface DateParts {
    year: string;
    month: string;
    day: string;
}

function argentinaParts(value: Date): DateParts | null {
    if (Number.isNaN(value.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: ARGENTINA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(value);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || "";
    return { year: get("year"), month: get("month"), day: get("day") };
}

function civilParts(value?: string | null): DateParts | null {
    if (!value) return null;
    const match = DATE_ONLY_PATTERN.exec(value);
    if (!match) return null;
    const [, year, month, day] = match;
    return { year, month, day };
}

/** Formatea fechas DATE de la API sin convertirlas a la zona horaria del navegador. */
export function formatDate(value?: string | null): string {
    const parts = civilParts(value);
    return parts ? `${parts.day}/${parts.month}/${parts.year}` : "-";
}

/** Formatea un instante real en la hora oficial de Buenos Aires. */
export function formatDateTime(value?: string | Date | null): string {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const formatter = new Intl.DateTimeFormat("es-AR", {
        timeZone: ARGENTINA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    const parts = formatter.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || "";
    return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

export function formatMonthYear(value?: string | null, abbreviated = false): string {
    const parts = civilParts(value);
    if (!parts) return "-";
    const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, 1));
    const formatted = new Intl.DateTimeFormat("es-AR", {
        timeZone: "UTC",
        month: abbreviated ? "short" : "long",
        year: "numeric",
    }).format(date);
    return formatted.replace(".", "");
}

export function todayDateInput(now = new Date()): string {
    const parts = argentinaParts(now);
    return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

export function currentMonthInput(now = new Date()): string {
    return todayDateInput(now).slice(0, 7);
}

export function toDateInputValue(value?: string | null): string {
    const parts = civilParts(value);
    return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

export function addMonthsToDateInput(value: string, months: number): string {
    const parts = civilParts(value);
    if (!parts || !Number.isInteger(months)) return "";
    const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
    date.setUTCMonth(date.getUTCMonth() + months);
    return date.toISOString().slice(0, 10);
}

/** Suma días a una fecha civil sin depender de la zona horaria del navegador. */
export function addDaysToDateInput(value: string, days: number): string {
    const parts = civilParts(value);
    if (!parts || !Number.isInteger(days)) return "";
    const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

export function getDaysFromToday(value: string, now = new Date()): number {
    const target = toDateInputValue(value);
    const today = todayDateInput(now);
    if (!target || !today) return Number.POSITIVE_INFINITY;
    const targetMs = Date.parse(`${target}T00:00:00.000Z`);
    const todayMs = Date.parse(`${today}T00:00:00.000Z`);
    return Math.round((targetMs - todayMs) / 86_400_000);
}
