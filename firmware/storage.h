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
    char    name[24];
    uint8_t mode;       // MODE_SWITCH / MODE_PULSE / MODE_TIMER
    uint16_t pulseMs;   // duración en ms (para PULSE y TIMER)
};

struct InputConfig {
    char name[24];
    char haClass[20];   // clase HA: "door", "motion", etc.
    bool inverted;      // true = NC (normal cerrado)
};

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
    cfg.relayCount = 4;
    cfg.inputCount = 8;

    const char* relayNames[] = { "Relé 1", "Relé 2", "Relé 3", "Relé 4",
                                  "Relé 5", "Relé 6", "Relé 7", "Relé 8" };
    for (int i = 0; i < RELAY_MAX; i++) {
        strlcpy(cfg.relay[i].name, relayNames[i], sizeof(cfg.relay[i].name));
        cfg.relay[i].mode    = MODE_SWITCH;
        cfg.relay[i].pulseMs = 500;
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
    cfg.relayCount = p.getUChar("rcnt",   4);
    cfg.inputCount = p.getUChar("icnt",   8);
    p.getBytes("relays", cfg.relay,       sizeof(cfg.relay));
    p.getBytes("inputs", cfg.input,       sizeof(cfg.input));
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
    p.putUChar("rcnt",   cfg.relayCount);
    p.putUChar("icnt",   cfg.inputCount);
    p.putBytes("relays", cfg.relay,       sizeof(cfg.relay));
    p.putBytes("inputs", cfg.input,       sizeof(cfg.input));
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
