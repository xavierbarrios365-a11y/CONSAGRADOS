
/**
 * Service for Cloudinary image uploads using an Unsigned Upload Preset.
 * This allows uploading directly from the browser without exposing API secrets.
 */

const CLOUDINARY_CLOUD_NAME = "dko8viuwt";
const CLOUDINARY_UPLOAD_PRESET = "consagrados";

export const uploadToCloudinary = async (file: File | string): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
        const formData = new FormData();

        if (typeof file === 'string') {
            // Cloudinary necesita el prefijo data URI completo para base64
            const base64Data = file.startsWith('data:') ? file : `data:image/jpeg;base64,${file}`;
            formData.append('file', base64Data);
        } else {
            formData.append('file', file);
        }
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
        }

        const data = await response.json();
        return { success: true, url: data.secure_url };
    } catch (error: any) {
        console.error("[CLOUDINARY] Upload error:", error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Transforms a Cloudinary URL to a specific format (e.g., resizing or cropping).
 * @param url The original Cloudinary secure_url.
 * @param transform E.g., 'w_500,c_fill,g_face'
 */
export const transformCloudinaryUrl = (url: string, transform: string) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', `/upload/${transform}/`);
};
