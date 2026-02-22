/**
 * Robust date parser for Google Sheets data.
 * Handles: serial numbers (46067), DD/MM/YYYY strings, ISO strings, Date objects.
 * Returns a valid Date or null.
 */
export const parseAttendanceDate = (value: any): Date | null => {
    if (!value || value === 'N/A' || value === '') return null;

    // 0. Handle native Date object (if passed directly)
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    // 1. Google Sheets serial number (e.g., 46067 = days since 1899-12-30)
    const numVal = typeof value === 'number' ? value : parseFloat(String(value));
    if (!isNaN(numVal) && numVal > 1000 && numVal < 100000 && !String(value).includes('/') && !String(value).includes('-')) {
        // Google Sheets epoch: Dec 30, 1899
        const sheetsEpoch = new Date(1899, 11, 30);
        const result = new Date(sheetsEpoch.getTime() + numVal * 86400000);
        if (!isNaN(result.getTime()) && result.getFullYear() >= 2020 && result.getFullYear() <= 2030) return result;
    }

    const strVal = String(value).trim();

    // 2. DD/MM/YYYY or DD-MM-YYYY format
    const parts = strVal.split(/[\/\-]/);
    if (parts.length === 3) {
        const [p1, p2, p3] = parts.map(p => parseInt(p, 10));
        // Determine if DD/MM/YYYY or MM/DD/YYYY (assume DD/MM/YYYY if day > 12)
        let d: Date;
        if (p1 > 12) {
            d = new Date(p3, p2 - 1, p1); // DD/MM/YYYY
        } else if (p2 > 12) {
            d = new Date(p3, p1 - 1, p2); // MM/DD/YYYY
        } else {
            d = new Date(p3, p2 - 1, p1); // Default DD/MM/YYYY
        }
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2020) return d;
    }

    // 3. Robust parsing for strings with potential extra text (regex extraction)
    const dateMatch = strVal.match(/(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
    if (dateMatch) {
        const rawMatch = dateMatch[0];
        const fallback = new Date(rawMatch);
        if (!isNaN(fallback.getTime()) && fallback.getFullYear() >= 2020 && fallback.getFullYear() <= 2030) return fallback;

        const matchParts = rawMatch.split(/[\/\-]/);
        if (matchParts.length === 3) {
            const [mp1, mp2, mp3] = matchParts.map(p => parseInt(p, 10));
            let d: Date;
            if (mp1 > 2000) d = new Date(mp1, mp2 - 1, mp3); // YYYY-MM-DD
            else if (mp3 > 2000) d = new Date(mp3, mp2 - 1, mp1); // DD/MM/YYYY
            else d = new Date(rawMatch);

            if (!isNaN(d.getTime()) && d.getFullYear() >= 2020) return d;
        }
    }

    // 4. ISO string or other parseable format (original fallback)
    const fallback = new Date(strVal);
    if (!isNaN(fallback.getTime()) && fallback.getFullYear() >= 2020 && fallback.getFullYear() <= 2030) return fallback;

    return null;
};
