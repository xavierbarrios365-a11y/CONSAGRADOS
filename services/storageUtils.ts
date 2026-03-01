
/**
 * Utility for client-side image compression before upload.
 * This helps stay within Google Drive "Always Free" limits and improves performance.
 */

export const compressImage = (file: File, maxWidth: number = 1000, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate aspect ratio
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Export as base64 string (stripped of prefix)
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
                resolve(compressedBase64);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Standardizes Google Drive image URLs to use the view endpoint directly.
 */
export const formatDriveUrl = (url: string | undefined, name?: string) => {
    // Generate a fallback initials avatar if name is provided, otherwise generic
    const fallbackName = name ? encodeURIComponent(name) : 'Agente';
    const DEFAULT_AVATAR = `https://ui-avatars.com/api/?name=${fallbackName}&background=1A1A1A&color=FFB700&size=200&bold=true`;

    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'N/A' || url === 'PENDIENTE') return DEFAULT_AVATAR;

    if (url.includes('supabase.co') || url.includes('unsplash.com') || url.includes('ui-avatars.com') || (url.startsWith('http') && !url.includes('drive.google.com') && !url.includes('docs.google.com'))) {
        return url;
    }

    const driveRegex = /(?:id=|\/d\/|file\/d\/|open\?id=|uc\?id=|\/file\/d\/|preview\/d\/|open\?id=)([\w-]{25,100})/;
    const match = url.match(driveRegex);

    let fileId = "";
    if (match && match[1]) {
        fileId = match[1];
    } else if (url.length >= 25 && !url.includes('/') && !url.includes('.') && !url.includes(':')) {
        fileId = url;
    }

    if (fileId) {
        // Restore standard Drive thumbnail endpoint (lh3 fails for non-Photo drive IDs with 403)
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }

    if (url.startsWith('http') || url.startsWith('/')) return url;

    return DEFAULT_AVATAR;
};
