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

export const initRemoteConfig = async () => {
    try {
        await fetchAndActivate(remoteConfig);
        console.log("Remote Config Activated");
    } catch (err) {
        console.error("Failed to fetch remote config:", err);
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
