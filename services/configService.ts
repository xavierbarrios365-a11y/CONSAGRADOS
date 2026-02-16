import { fetchAndActivate, getValue } from "firebase/remote-config";
import { remoteConfig } from "../firebase-config";

/**
 * Service to manage application configuration remotely and for free.
 */

// Default values
remoteConfig.defaultConfig = {
    "app_threat_level": "NORMAL",
    "broadcast_active": false,
    "maintenance_mode": false
};

let remoteConfigInitialized = false;

export const initRemoteConfig = async () => {
    if (remoteConfigInitialized) return;
    remoteConfigInitialized = true;
    try {
        await fetchAndActivate(remoteConfig);
    } catch (err) {
        // Silenciar — Remote Config falla en localhost sin consecuencias
    }
};

export const getConfigValue = (key: string) => {
    return getValue(remoteConfig, key);
};

export const getThreatLevel = () => {
    return getValue(remoteConfig, "app_threat_level").asString();
};

export const isMaintenanceMode = () => {
    return getValue(remoteConfig, "maintenance_mode").asBoolean();
};
