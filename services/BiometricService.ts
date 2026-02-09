
/**
 * BiometricService.ts
 * Maneja la autenticación biométrica (FaceID/Fingerprint) usando WebAuthn.
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

export const isBiometricAvailable = async (): Promise<boolean> => {
    if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
    }
    return false;
};

export const registerBiometric = async (userId: string, userName: string): Promise<string | null> => {
    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

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
            pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
            },
            timeout: 60000,
            attestation: "none",
        };

        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions,
        });

        if (credential) {
            // Retornamos el ID en formato string (base64url por defecto en WebAuthn)
            return (credential as any).id;
        }
    } catch (error) {
        console.error("Error al registrar biometría:", error);
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
