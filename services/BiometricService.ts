
/**
 * BiometricService.ts
 * Maneja la autenticación biométrica (FaceID/Fingerprint) usando WebAuthn.
 */

export const isBiometricAvailable = async (): Promise<boolean> => {
    // Verificar si el navegador soporta WebAuthn y si el dispositivo tiene biometría
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
            // En una implementación real, enviaríamos la clave pública al servidor.
            // Para este proyecto, usaremos el ID de la credencial como "token" de prueba.
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
                id: Uint8Array.from(atob(storedCredentialId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
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
