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

    const date = new Date(year, month - 1, day, hour || 8, minute || 0);
    return isNaN(date.getTime()) ? new Date() : date;
};

const formatICSTime = (date: Date): string => {
    if (!date || isNaN(date.getTime())) {
        console.warn("Invalid date provided to formatICSTime, falling back to empty string.");
        return "";
    }
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
    const baseUrl = "https://www.google.com/calendar/render?action=TEMPLATE";

    const startStr = formatICSTime(event.startTime);
    const endStr = formatICSTime(event.endTime);

    if (!startStr || !endStr) {
        return ""; // Cannot generate link without valid dates
    }

    const dates = `${startStr}/${endStr}`;

    // Use manual encoding for maximum compatibility across browsers & mobile
    const params = [
        `text=${encodeURIComponent(event.title)}`,
        `details=${encodeURIComponent(event.description)}`,
        `location=${encodeURIComponent(event.location || "")}`,
        `dates=${encodeURIComponent(dates)}`
    ].join("&");

    return `${baseUrl}&${params}`;
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
