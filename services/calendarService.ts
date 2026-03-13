export interface CalendarEvent {
    title: string;
    description: string;
    location?: string;
    startTime: Date;
    endTime: Date;
}

/**
 * Service to manage calendar exports for free.
 * Fixed: proper URL encoding and ICS CRLF line endings to avoid protocol failures.
 */

export const parseEventDate = (dateStr: string, timeStr?: string): Date => {
    // Intenta manejar formatos DD/MM/YYYY y YYYY-MM-DD
    let [year, month, day] = [0, 0, 0];

    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts[0].length === 4) { // YYYY/MM/DD
            [year, month, day] = parts.map(Number);
        } else { // DD/MM/YYYY
            [day, month, year] = parts.map(Number);
        }
    } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 4) { // YYYY-MM-DD
            [year, month, day] = parts.map(Number);
        } else { // DD-MM-YYYY
            [day, month, year] = parts.map(Number);
        }
    }

    const [hour, minute] = (timeStr || '08:00').replace(/[^0-9:]/g, '').split(':').map(Number);

    // Si el año viene en 2 dígitos, asumimos 2000+
    if (year > 0 && year < 100) year += 2000;

    const date = new Date(year, month - 1, day, hour !== undefined && !isNaN(hour) ? hour : 8, minute !== undefined && !isNaN(minute) ? minute : 0);
    return isNaN(date.getTime()) ? new Date() : date;
};

/**
 * Formato para Google Calendar: YYYYMMDDTHHmmSS
 * NOTA: No incluimos la 'Z' al final para que Google lo interprete en la zona horaria del usuario (Local).
 */
const formatLocalTime = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return "";

    const pad = (n: number) => n.toString().padStart(2, '0');

    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());

    return `${yyyy}${mm}${dd}T${hh}${min}${ss}`;
};

const formatICSTime = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return "";
    return date.toISOString().replace(/-|:|\.\d{3}/g, "");
};

const sanitizeText = (text: string): string => {
    // Escape special chars for ICS format (backslashes, semicolons, commas, newlines)
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
};

export const generateGoogleCalendarLink = (event: CalendarEvent): string => {
    // Usamos el formato preferido por Google para máxima compatibilidad
    // https://calendar.google.com/calendar/render?action=TEMPLATE
    const baseUrl = "https://calendar.google.com/calendar/render";

    const startStr = formatLocalTime(event.startTime);
    const endStr = formatLocalTime(event.endTime);

    if (!startStr || !endStr) return "";

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        details: event.description,
        location: event.location || "",
        dates: `${startStr}/${endStr}`
    });

    return `${baseUrl}?${params.toString()}`;
};

export const downloadIcsFile = (event: CalendarEvent) => {
    // RFC 5545 requires CRLF line endings
    const CRLF = "\r\n";

    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Consagrados2026//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `DTSTART:${formatICSTime(event.startTime)}`,
        `DTEND:${formatICSTime(event.endTime)}`,
        `SUMMARY:${sanitizeText(event.title)}`,
        `DESCRIPTION:${sanitizeText(event.description)}`,
        `LOCATION:${sanitizeText(event.location || "")}`,
        `UID:${Date.now()}@consagrados2026`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join(CRLF);

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${event.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, "").replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};
