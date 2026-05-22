#pragma once
#include <Preferences.h>

// ==========================================================
//   CONFIG STRUCT — se guarda en flash NVS del ESP32
// ==========================================================

#define RELAY_MAX 8
#define INPUT_MAX 8

// Modos de relé
#define MODE_SWITCH  0   // toggle ON/OFF
#define MODE_PULSE   1   // pulso momentáneo → útil para portones, timbres
#define MODE_TIMER   2   // temporizador → útil para riego, ventilación

// Tipos de dispositivo HA para relés
// Determina el ícono y la categoría en HomeKit / Siri
#define HA_RELAY_SWITCH  0   // interruptor genérico
#define HA_RELAY_LIGHT   1   // lámpara → "Siri, apagá las luces del living"
#define HA_RELAY_FAN     2   // ventilador

// Clases de HA para binary_sensor
#define HA_CLASSES_COUNT 8
const char* HA_CLASSES[HA_CLASSES_COUNT] = {
    "door", "window", "motion", "smoke",
    "moisture", "vibration", "None", "garage_door"
};
const char* HA_CLASSES_LABEL[HA_CLASSES_COUNT] = {
    "Puerta", "Ventana", "Movimiento", "Humo",
    "Agua/Humedad", "Vibración", "Genérico", "Portón garaje"
};

struct RelayConfig {
    char     name[24];
    uint8_t  mode;      // MODE_SWITCH / MODE_PULSE / MODE_TIMER
    uint16_t pulseMs;   // duración en ms (para PULSE y TIMER)
    uint8_t  haType;    // HA_RELAY_SWITCH / LIGHT / FAN
};

struct InputConfig {
    char name[24];
    char haClass[20];   // clase HA: "door", "motion", etc.
    bool inverted;      // true = NC (normal cerrado)
};

// Modo de conexión MQTT
#define MODE_HA        0   // Home Assistant (Mosquitto) — comportamiento original
#define MODE_GUAYCORE  1   // GuayCore IoT platform (EMQX)

struct Config {
    // ── Red ────────────────────────────────────────────────
    char wifiSSID[33];
    char wifiPass[65];

    // ── MQTT Broker ────────────────────────────────────────
    char     mqttHost[65];
    uint16_t mqttPort;
    char     mqttUser[33];
    char     mqttPass[65];

    // ── Módulo ─────────────────────────────────────────────
    char deviceId[33];    // único por módulo (sin espacios)
    char deviceName[49];  // nombre visible en HA
    char otaPass[33];

    // ── Canales ────────────────────────────────────────────
    uint8_t relayCount;
    uint8_t inputCount;

    // ── Config por canal ───────────────────────────────────
    RelayConfig relay[RELAY_MAX];
    InputConfig input[INPUT_MAX];

    // ── HomeKit / HA ───────────────────────────────────────
    char area[24];      // habitación → agrupa dispositivos en la app Casa

    // ── GuayCore ───────────────────────────────────────────
    // Campos usados solo en MODE_GUAYCORE
    char gcTenantId[37];      // UUID del tenant (ej: "550e8400-e29b-41d4-a716-...")
    char gcDeviceKey[65];     // MQTT username generado por DevicesService.create()
    char gcDeviceSecret[65];  // MQTT password (plain) — solo se muestra UNA vez
    uint8_t mqttMode;         // MODE_HA (0) o MODE_GUAYCORE (1)

    // ── Flags ──────────────────────────────────────────────
    bool configured;    // false = mostrar portal en próximo arranque
};

// Instancia global accesible desde todos los archivos
Config cfg;

// ==========================================================
//   DEFAULTS — valores iniciales si no hay config guardada
// ==========================================================
void configDefaults() {
    strlcpy(cfg.wifiSSID,   "",              sizeof(cfg.wifiSSID));
    strlcpy(cfg.wifiPass,   "",              sizeof(cfg.wifiPass));
    strlcpy(cfg.mqttHost,   "192.168.1.100", sizeof(cfg.mqttHost));
    cfg.mqttPort = 1883;
    strlcpy(cfg.mqttUser,   "mqtt",          sizeof(cfg.mqttUser));
    strlcpy(cfg.mqttPass,   "",              sizeof(cfg.mqttPass));
    strlcpy(cfg.deviceId,   "modulo_01",     sizeof(cfg.deviceId));
    strlcpy(cfg.deviceName, "Módulo 01",     sizeof(cfg.deviceName));
    strlcpy(cfg.otaPass,    "esp32ota",      sizeof(cfg.otaPass));
    strlcpy(cfg.area,       "General",       sizeof(cfg.area));
    strlcpy(cfg.gcTenantId,    "",  sizeof(cfg.gcTenantId));
    strlcpy(cfg.gcDeviceKey,   "",  sizeof(cfg.gcDeviceKey));
    strlcpy(cfg.gcDeviceSecret,"",  sizeof(cfg.gcDeviceSecret));
    cfg.mqttMode = MODE_HA;
    cfg.relayCount = 4;
    cfg.inputCount = 8;

    const char* relayNames[] = { "Relé 1", "Relé 2", "Relé 3", "Relé 4",
                                  "Relé 5", "Relé 6", "Relé 7", "Relé 8" };
    for (int i = 0; i < RELAY_MAX; i++) {
        strlcpy(cfg.relay[i].name, relayNames[i], sizeof(cfg.relay[i].name));
        cfg.relay[i].mode    = MODE_SWITCH;
        cfg.relay[i].pulseMs = 500;
        cfg.relay[i].haType  = HA_RELAY_SWITCH;
    }
    const char* inputNames[] = {
        "Entrada 1", "Entrada 2", "Entrada 3", "Entrada 4",
        "Entrada 5", "Entrada 6", "Entrada 7", "Entrada 8"
    };
    for (int i = 0; i < INPUT_MAX; i++) {
        strlcpy(cfg.input[i].name,    inputNames[i], sizeof(cfg.input[i].name));
        strlcpy(cfg.input[i].haClass, "door",         sizeof(cfg.input[i].haClass));
        cfg.input[i].inverted = false;
    }
    cfg.configured = false;
}

// ==========================================================
//   CARGA desde NVS
// ==========================================================
void configLoad() {
    configDefaults();
    Preferences p;
    if (!p.begin("modular", true)) return;  // read-only
    if (!p.getBool("cfgd", false)) { p.end(); return; }

    p.getBytes("wifi",   &cfg.wifiSSID,   sizeof(cfg.wifiSSID));
    p.getBytes("wifipw", &cfg.wifiPass,   sizeof(cfg.wifiPass));
    p.getBytes("mhost",  &cfg.mqttHost,   sizeof(cfg.mqttHost));
    cfg.mqttPort = p.getUShort("mport",   1883);
    p.getBytes("muser",  &cfg.mqttUser,   sizeof(cfg.mqttUser));
    p.getBytes("mpw",    &cfg.mqttPass,   sizeof(cfg.mqttPass));
    p.getBytes("devid",  &cfg.deviceId,   sizeof(cfg.deviceId));
    p.getBytes("devnm",  &cfg.deviceName, sizeof(cfg.deviceName));
    p.getBytes("otapw",  &cfg.otaPass,    sizeof(cfg.otaPass));
    p.getBytes("area",   &cfg.area,       sizeof(cfg.area));
    p.getBytes("gctid",  &cfg.gcTenantId,    sizeof(cfg.gcTenantId));
    p.getBytes("gckey",  &cfg.gcDeviceKey,   sizeof(cfg.gcDeviceKey));
    p.getBytes("gcsec",  &cfg.gcDeviceSecret,sizeof(cfg.gcDeviceSecret));
    cfg.mqttMode = p.getUChar("mqttmode", MODE_HA);
    cfg.relayCount = p.getUChar("rcnt",   4);
    cfg.inputCount = p.getUChar("icnt",   8);
    p.getBytes("relays2", cfg.relay,      sizeof(cfg.relay));  // v2: incluye haType
    p.getBytes("inputs",  cfg.input,      sizeof(cfg.input));
    cfg.configured = true;
    p.end();
}

// ==========================================================
//   GUARDA en NVS
// ==========================================================
void configSave() {
    Preferences p;
    p.begin("modular", false);  // read-write
    p.putBytes("wifi",   &cfg.wifiSSID,   sizeof(cfg.wifiSSID));
    p.putBytes("wifipw", &cfg.wifiPass,   sizeof(cfg.wifiPass));
    p.putBytes("mhost",  &cfg.mqttHost,   sizeof(cfg.mqttHost));
    p.putUShort("mport", cfg.mqttPort);
    p.putBytes("muser",  &cfg.mqttUser,   sizeof(cfg.mqttUser));
    p.putBytes("mpw",    &cfg.mqttPass,   sizeof(cfg.mqttPass));
    p.putBytes("devid",  &cfg.deviceId,   sizeof(cfg.deviceId));
    p.putBytes("devnm",  &cfg.deviceName, sizeof(cfg.deviceName));
    p.putBytes("otapw",  &cfg.otaPass,    sizeof(cfg.otaPass));
    p.putBytes("area",   &cfg.area,       sizeof(cfg.area));
    p.putBytes("gctid",  &cfg.gcTenantId,    sizeof(cfg.gcTenantId));
    p.putBytes("gckey",  &cfg.gcDeviceKey,   sizeof(cfg.gcDeviceKey));
    p.putBytes("gcsec",  &cfg.gcDeviceSecret,sizeof(cfg.gcDeviceSecret));
    p.putUChar("mqttmode", cfg.mqttMode);
    p.putUChar("rcnt",   cfg.relayCount);
    p.putUChar("icnt",   cfg.inputCount);
    p.putBytes("relays2", cfg.relay,      sizeof(cfg.relay));  // v2: incluye haType
    p.putBytes("inputs",  cfg.input,      sizeof(cfg.input));
    p.putBool("cfgd",    true);
    p.end();
    cfg.configured = true;
}

// ==========================================================
//   RESET — borra todo y vuelve al portal
// ==========================================================
void configReset() {
    Preferences p;
    p.begin("modular", false);
    p.clear();
    p.end();
    configDefaults();
}
