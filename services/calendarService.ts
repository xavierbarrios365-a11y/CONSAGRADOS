export interface CalendarEvent {
    title: string;
    description: string;
    location?: string;
    startTime: Date;
    endTime: Date;
}

/**
 * Service to manage calendar exports for free.
 */

export const generateGoogleCalendarLink = (event: CalendarEvent): string => {
    const baseUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
    const formatTime = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const dates = `${formatTime(event.startTime)}/${formatTime(event.endTime)}`;
    const params = new URLSearchParams({
        text: event.title,
        details: event.description,
        location: event.location || "",
        dates: dates
    });

    return `${baseUrl}&${params.toString()}`;
};

export const downloadIcsFile = (event: CalendarEvent) => {
    const formatTime = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `DTSTART:${formatTime(event.startTime)}`,
        `DTEND:${formatTime(event.endTime)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description}`,
        `LOCATION:${event.location || ""}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${event.title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
