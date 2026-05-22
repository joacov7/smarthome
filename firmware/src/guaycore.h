#pragma once
/*
 * guaycore.h — Integración ESP32 ↔ GuayCore IoT Platform
 *
 * En modo GuayCore el firmware:
 *   1. Se autentica ante EMQX con deviceKey + deviceSecret
 *   2. Publica telemetría cada GUAY_TELEMETRY_MS milisegundos
 *   3. Escucha comandos de relés y config remota
 *   4. Recibe actualizaciones OTA desde campañas GuayCore
 *
 * Topic schema:
 *   guay/{tenantId}/device/{deviceId}/telemetry   ← publicamos
 *   guay/{tenantId}/device/{deviceId}/events       ← publicamos
 *   guay/{tenantId}/device/{deviceId}/status       ← LWT
 *   guay/{tenantId}/device/{deviceId}/commands     → recibimos
 *   guay/{tenantId}/device/{deviceId}/config       → recibimos
 *   guay/{tenantId}/broadcast/ota/update           → recibimos OTA
 */

#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include <ArduinoJson.h>

// ─── Intervalo de telemetría (ms) ─────────────────────────
#ifndef GUAY_TELEMETRY_MS
#  define GUAY_TELEMETRY_MS 30000   // 30 segundos
#endif

// ─── Topics (construidos en guaycoreSetupTopics) ─────────
static char gTopicStatus[96];
static char gTopicTelemetry[96];
static char gTopicEvents[96];
static char gTopicCommands[96];
static char gTopicConfig[96];
static char gTopicOta[96];

// ─── Estado ────────────────────────────────────────────────
static unsigned long gLastTelemetry = 0;

// Forward declarations (definidas en firmware.ino)
extern uint8_t relayState;
extern uint8_t inputState;
extern bool relayModuleOk;
extern bool inputModuleOk;
void setRelay(uint8_t ch, bool on);
bool getRelay(uint8_t ch);

// ==========================================================
//   TOPICS — construir strings una sola vez
// ==========================================================
void guaycoreSetupTopics() {
    snprintf(gTopicStatus,    sizeof(gTopicStatus),
             "guay/%s/device/%s/status",    cfg.gcTenantId, cfg.deviceId);
    snprintf(gTopicTelemetry, sizeof(gTopicTelemetry),
             "guay/%s/device/%s/telemetry", cfg.gcTenantId, cfg.deviceId);
    snprintf(gTopicEvents,    sizeof(gTopicEvents),
             "guay/%s/device/%s/events",    cfg.gcTenantId, cfg.deviceId);
    snprintf(gTopicCommands,  sizeof(gTopicCommands),
             "guay/%s/device/%s/commands",  cfg.gcTenantId, cfg.deviceId);
    snprintf(gTopicConfig,    sizeof(gTopicConfig),
             "guay/%s/device/%s/config",    cfg.gcTenantId, cfg.deviceId);
    snprintf(gTopicOta,       sizeof(gTopicOta),
             "guay/%s/broadcast/ota/update", cfg.gcTenantId);
}

// ==========================================================
//   TELEMETRÍA — publicar estado completo del módulo
// ==========================================================
void guaycorePublishTelemetry(PubSubClient& mqtt) {
    if (!mqtt.connected()) return;

    JsonDocument doc;
    doc["ts"]   = millis();                     // ms desde arranque
    doc["rssi"] = WiFi.RSSI();

    // Estado de relés
    for (int i = 1; i <= cfg.relayCount; i++) {
        char key[10];
        snprintf(key, sizeof(key), "relay%d", i);
        doc[key] = getRelay(i) ? 1 : 0;
    }

    // Estado de entradas (PCF8574A: LOW = activo)
    for (int i = 0; i < cfg.inputCount; i++) {
        char key[10];
        snprintf(key, sizeof(key), "in%d", i + 1);
        bool active = !(inputState & (1 << i));
        // Aplicar inversión NC/NO
        doc[key] = (cfg.input[i].inverted ? !active : active) ? 1 : 0;
    }

    char buf[512];
    size_t n = serializeJson(doc, buf, sizeof(buf));
    mqtt.publish(gTopicTelemetry, buf, n);
    Serial.printf("[GC] telemetría → %s (%d bytes)\n", gTopicTelemetry, (int)n);
}

// ==========================================================
//   EVENTO — publicar un evento puntual
// ==========================================================
void guaycorePublishEvent(PubSubClient& mqtt, const char* type,
                          const char* severity, JsonDocument& data) {
    if (!mqtt.connected()) return;
    JsonDocument doc;
    doc["type"]     = type;
    doc["severity"] = severity;
    doc["data"]     = data;

    char buf[256];
    size_t n = serializeJson(doc, buf, sizeof(buf));
    mqtt.publish(gTopicEvents, buf, n);
}

// ==========================================================
//   COMANDO — procesar payload JSON entrante
//
//  Formato esperado (enviado por el backend o rules engine):
//  { "relay": 1, "state": "ON" }          ← toggle ON/OFF
//  { "relay": 2, "state": "PULSE" }       ← pulso
//  { "relays": {"1":"ON","2":"OFF"} }     ← múltiple
// ==========================================================
void guaycoreHandleCommand(PubSubClient& mqtt,
                           const byte* payload, unsigned int len) {
    JsonDocument doc;
    if (deserializeJson(doc, payload, len) != DeserializationError::Ok) {
        Serial.println("[GC] Comando JSON inválido");
        return;
    }

    // Formato simple: {"relay": N, "state": "ON|OFF|PULSE"}
    if (doc["relay"].is<int>()) {
        uint8_t ch  = doc["relay"].as<uint8_t>();
        const char* st = doc["state"] | "ON";
        uint16_t ms = cfg.relay[ch - 1].pulseMs;

        if (strcmp(st, "ON") == 0) {
            setRelay(ch, true);
        } else if (strcmp(st, "OFF") == 0) {
            setRelay(ch, false);
        } else if (strcmp(st, "PULSE") == 0) {
            setRelay(ch, true);
            // El auto-off lo maneja el loop principal vía relayAutoOff[]
            extern unsigned long relayAutoOff[];
            relayAutoOff[ch - 1] = millis() + ms;
        } else if (strcmp(st, "TOGGLE") == 0) {
            setRelay(ch, !getRelay(ch));
        }

        // Publicar telemetría inmediata post-comando
        guaycorePublishTelemetry(mqtt);
        Serial.printf("[GC] relay%d → %s\n", ch, st);
        return;
    }

    // Formato múltiple: {"relays": {"1":"ON","2":"OFF"}}
    if (doc["relays"].is<JsonObject>()) {
        for (JsonPair kv : doc["relays"].as<JsonObject>()) {
            uint8_t ch = atoi(kv.key().c_str());
            const char* st = kv.value().as<const char*>();
            if (ch < 1 || ch > cfg.relayCount) continue;
            if      (strcmp(st, "ON")  == 0) setRelay(ch, true);
            else if (strcmp(st, "OFF") == 0) setRelay(ch, false);
            else if (strcmp(st, "TOGGLE") == 0) setRelay(ch, !getRelay(ch));
        }
        guaycorePublishTelemetry(mqtt);
    }
}

// ==========================================================
//   CONFIG REMOTA — aplicar JSON de config del backend
//
//  El backend puede enviar:
//  { "telemetryMs": 60000, "relayCount": 4 }
// ==========================================================
void guaycoreHandleConfig(const byte* payload, unsigned int len) {
    JsonDocument doc;
    if (deserializeJson(doc, payload, len) != DeserializationError::Ok) return;

    if (doc["telemetryMs"].is<int>()) {
        // Guardamos en metadata (no en NVS — se pierde al reiniciar)
        // Para persistencia habría que extender configSave()
        Serial.printf("[GC] config: telemetryMs=%d\n", doc["telemetryMs"].as<int>());
    }
    Serial.println("[GC] config remota recibida");
}

// ==========================================================
//   OTA DESDE GUAYCORE — descarga por HTTP y flashea
//
//  Payload del topic guay/{t}/broadcast/ota/update:
//  {
//    "version":     "1.2.0",
//    "downloadUrl": "http://...",
//    "sha256":      "abc...",
//    "sizeBytes":   123456,
//    "filter":      {}   // vacío = aplica a todos
//  }
// ==========================================================
void guaycoreHandleOta(PubSubClient& mqtt,
                       const byte* payload, unsigned int len) {
    JsonDocument doc;
    if (deserializeJson(doc, payload, len) != DeserializationError::Ok) return;

    const char* url     = doc["downloadUrl"] | "";
    const char* version = doc["version"]     | "";
    if (strlen(url) == 0) return;

    Serial.printf("[GC] OTA disponible v%s — %s\n", version, url);

    // Publicar evento antes de actualizar
    JsonDocument evData;
    evData["version"] = version;
    guaycorePublishEvent(mqtt, "ota_start", "info", evData);
    mqtt.loop();   // asegurar que se envíe antes del flash

    WiFiClient client;
    t_httpUpdate_return ret = httpUpdate.update(client, url);

    switch (ret) {
        case HTTP_UPDATE_FAILED:
            Serial.printf("[GC] OTA falló: %s\n", httpUpdate.getLastErrorString().c_str());
            break;
        case HTTP_UPDATE_NO_UPDATES:
            Serial.println("[GC] OTA: sin cambios");
            break;
        case HTTP_UPDATE_OK:
            Serial.println("[GC] OTA OK — reiniciando...");
            // ESP.restart() lo llama automáticamente la librería
            break;
    }
}

// ==========================================================
//   CALLBACK MQTT — router de mensajes entrantes
// ==========================================================
void guaycoreMqttCallback(PubSubClient& mqtt,
                          char* topic, byte* payload, unsigned int len) {
    if (strcmp(topic, gTopicCommands) == 0) {
        guaycoreHandleCommand(mqtt, payload, len);
    } else if (strcmp(topic, gTopicConfig) == 0) {
        guaycoreHandleConfig(payload, len);
    } else if (strcmp(topic, gTopicOta) == 0) {
        guaycoreHandleOta(mqtt, payload, len);
    }
}

// ==========================================================
//   CONNECT — autenticar ante EMQX con deviceKey/Secret
//             y suscribirse a todos los topics de entrada
// ==========================================================
bool guaycoreConnect(PubSubClient& mqtt) {
    // ClientId = deviceId, user = deviceKey, pass = deviceSecret
    bool ok = mqtt.connect(
        cfg.deviceId,
        cfg.gcDeviceKey,
        cfg.gcDeviceSecret,
        gTopicStatus, 1, true, "offline"
    );

    if (!ok) {
        Serial.printf("[GC] MQTT connect falló, rc=%d\n", mqtt.state());
        return false;
    }

    mqtt.subscribe(gTopicCommands, 1);
    mqtt.subscribe(gTopicConfig,   1);
    mqtt.subscribe(gTopicOta,      1);
    mqtt.publish(gTopicStatus, "online", true);

    // Publicar telemetría inicial
    guaycorePublishTelemetry(mqtt);

    Serial.printf("[GC] MQTT conectado como %s\n", cfg.gcDeviceKey);
    return true;
}

// ==========================================================
//   LOOP TICK — llamar desde loop() en modo GuayCore
// ==========================================================
void guaycoreTick(PubSubClient& mqtt) {
    unsigned long now = millis();

    if (!mqtt.connected()) return;

    if (now - gLastTelemetry >= GUAY_TELEMETRY_MS) {
        gLastTelemetry = now;
        guaycorePublishTelemetry(mqtt);
    }
}
