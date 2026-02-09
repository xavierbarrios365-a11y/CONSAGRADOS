
/**
 * BiometricService.ts
 * Maneja la autenticación biométrica (FaceID/Fingerprint) usando WebAuthn.
 * V2: Soporte mejorado para múltiples credenciales en Android.
 */

// Helper para convertir string base64/base64url a Uint8Array de forma robusta
const base64ToUint8Array = (base64: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(b64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

// Helper para convertir Uint8Array a base64url
const uint8ArrayToBase64url = (buffer: Uint8Array): string => {
    let binary = '';
    buffer.forEach(byte => binary += String.fromCharCode(byte));
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const isBiometricAvailable = async (): Promise<boolean> => {
    if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
    }
    return false;
};

/**
 * Registra una nueva credencial biométrica.
 * @param userId ID del usuario
 * @param userName Nombre del usuario
 * @param existingCredentialIds IDs de credenciales existentes a excluir (para permitir multiples dispositivos)
 */
export const registerBiometric = async (
    userId: string,
    userName: string,
    existingCredentialIds: string[] = []
): Promise<string | null> => {
    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        // Convertir IDs existentes a formato de exclusión
        const excludeCredentials = existingCredentialIds
            .filter(id => id && id.length > 0)
            .map(id => ({
                id: base64ToUint8Array(id),
                type: 'public-key' as const,
            }));
        // Usar tipo any para evitar problemas de compatibilidad con BufferSource en diferentes versiones de TS
        const publicKeyCredentialCreationOptions: any = {
            challenge: challenge,
            rp: {
                name: "Consagrados 2026",
                id: window.location.hostname,
            },
            user: {
                id: Uint8Array.from(userId, c => c.charCodeAt(0)),
                name: userName,
                displayName: userName,
            },
            pubKeyCredParams: [
                { alg: -7, type: "public-key" },   // ES256
                { alg: -257, type: "public-key" }, // RS256 (mayor compatibilidad Android)
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
                residentKey: "preferred",
            },
            excludeCredentials: excludeCredentials,
            timeout: 90000,
            attestation: "none",
        };

        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions,
        }) as PublicKeyCredential | null;

        if (credential) {
            // Retornamos el ID en formato base64url seguro
            const rawId = new Uint8Array(credential.rawId);
            return uint8ArrayToBase64url(rawId);
        }
    } catch (error: any) {
        console.error("Error al registrar biometría:", error);
        // Dar feedback más específico para Android
        if (error.name === 'InvalidStateError') {
            throw new Error("ESTE DISPOSITIVO YA TIENE UNA CREDENCIAL REGISTRADA.");
        }
        if (error.name === 'NotAllowedError') {
            throw new Error("OPERACIÓN CANCELADA O NO PERMITIDA.");
        }
    }
    return null;
};

export const authenticateBiometric = async (storedCredentialId: string): Promise<boolean> => {
    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKeyCredentialRequestOptions: any = {
            challenge: challenge,
            allowCredentials: [{
                id: base64ToUint8Array(storedCredentialId),
                type: 'public-key',
            }],
            userVerification: "required",
            timeout: 60000,
        };

        const assertion = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions,
        });

        return !!assertion;
    } catch (error) {
        console.error("Error al autenticar biometría:", error);
    }
    return false;
};
