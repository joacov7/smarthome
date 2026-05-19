/*
 * Sistema Modular ESP32 — Firmware CPU
 * Hardware: Waveshare ESP32-S3 Zero
 *
 * Funcionalidades:
 *   - WiFi con reconexión automática
 *   - MQTT con reconexión automática + Last Will Testament
 *   - OTA (actualización por WiFi desde Arduino IDE)
 *   - Control de relés via I2C (PCF8574 @ RELAY_ADDR)
 *   - Lectura de entradas via I2C (PCF8574A @ INPUT_ADDR)
 *   - OLED 0.96" con estado del sistema en tiempo real
 *   - Auto-descubrimiento Home Assistant (entidades automáticas)
 *
 * Librerías requeridas (instalar desde Arduino IDE → Gestor de librerías):
 *   - PubSubClient   (Nick O'Leary)
 *   - Adafruit SSD1306
 *   - Adafruit GFX Library
 *
 * Board: "ESP32S3 Dev Module" en Arduino IDE
 * USB Mode: "USB-OTG (TinyUSB)" o "Hardware CDC and JTAG"
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoOTA.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"

// ── OLED ──────────────────────────────────────────────────
Adafruit_SSD1306 display(128, 64, &Wire, -1);
bool oledOk = false;

// ── Red ───────────────────────────────────────────────────
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

// ── Estado de módulos I2C ────────────────────────────────
uint8_t relayState = RELAY_ACTIVE_LOW ? 0xFF : 0x00;  // todos OFF
uint8_t inputState = 0xFF;
uint8_t inputPrev  = 0xFF;
bool    relayModuleOk = false;
bool    inputModuleOk = false;

// ── Timers no bloqueantes ─────────────────────────────────
unsigned long tInputCheck  = 0;
unsigned long tOledUpdate  = 0;
unsigned long tHeartbeat   = 0;
unsigned long tReconnect   = 0;
unsigned long tWifiCheck   = 0;

// ── Topics MQTT (construidos en setup) ───────────────────
char tRelaySet[80];   // esp32modular/{id}/relay
char tRelayState[80]; // esp32modular/{id}/relay
char tInputState[80]; // esp32modular/{id}/input
char tStatus[64];     // esp32modular/{id}/status

// ==========================================================
//   I2C — PCF8574 helpers
// ==========================================================

bool pcfWrite(uint8_t addr, uint8_t data) {
    Wire.beginTransmission(addr);
    Wire.write(data);
    return Wire.endTransmission() == 0;
}

bool pcfRead(uint8_t addr, uint8_t &data) {
    if (Wire.requestFrom(addr, (uint8_t)1) != 1) return false;
    data = Wire.read();
    return true;
}

bool i2cDevicePresent(uint8_t addr) {
    Wire.beginTransmission(addr);
    return Wire.endTransmission() == 0;
}

// ==========================================================
//   CONTROL DE RELÉS
// ==========================================================

void applyRelays() {
    if (!relayModuleOk) return;
    pcfWrite(RELAY_ADDR, relayState);
}

void setRelay(uint8_t ch, bool on) {
    if (ch < 1 || ch > RELAY_COUNT) return;
    uint8_t bit = ch - 1;
    bool active = RELAY_ACTIVE_LOW ? !on : on;
    if (active) relayState |=  (1 << bit);
    else        relayState &= ~(1 << bit);
    applyRelays();
}

bool getRelay(uint8_t ch) {
    if (ch < 1 || ch > RELAY_COUNT) return false;
    uint8_t bit = ch - 1;
    bool active = relayState & (1 << bit);
    return RELAY_ACTIVE_LOW ? !active : active;
}

// Pulso momentáneo — útil para portones, timbres, etc.
void pulseRelay(uint8_t ch, uint16_t ms = 500) {
    setRelay(ch, true);
    delay(ms);
    setRelay(ch, false);
}

// ==========================================================
//   MQTT — Publicación
// ==========================================================

void pubRelayState(uint8_t ch) {
    char topic[96];
    snprintf(topic, sizeof(topic), "%s/%d/state", tRelayState, ch);
    mqtt.publish(topic, getRelay(ch) ? "ON" : "OFF", true);
}

void pubInputState(uint8_t ch, bool active) {
    char topic[96];
    snprintf(topic, sizeof(topic), "%s/%d/state", tInputState, ch);
    mqtt.publish(topic, active ? "ON" : "OFF", true);
}

void pubAllStates() {
    for (int i = 1; i <= RELAY_COUNT; i++) pubRelayState(i);
    for (int i = 1; i <= INPUT_COUNT; i++)
        pubInputState(i, !(inputState & (1 << (i - 1))));
}

// ==========================================================
//   MQTT — Home Assistant Auto-Discovery
//   Crea las entidades automáticamente en HA sin configurar nada
// ==========================================================

void publishDiscovery() {
    char topic[128], payload[512];

    // Relés → switch
    for (int i = 1; i <= RELAY_COUNT; i++) {
        snprintf(topic, sizeof(topic),
            "homeassistant/switch/%s_relay_%d/config", DEVICE_ID, i);
        snprintf(payload, sizeof(payload),
            "{"
            "\"name\":\"Relay %d\","
            "\"uniq_id\":\"%s_r%d\","
            "\"cmd_t\":\"%s/%d/set\","
            "\"stat_t\":\"%s/%d/state\","
            "\"pl_on\":\"ON\","
            "\"pl_off\":\"OFF\","
            "\"ret\":true,"
            "\"avty_t\":\"%s\","
            "\"pl_avail\":\"online\","
            "\"pl_not_avail\":\"offline\","
            "\"dev\":{"
              "\"ids\":[\"%s\"],"
              "\"name\":\"%s\","
              "\"mf\":\"ESP32 Modular\","
              "\"mdl\":\"CPU S3 Zero\""
            "}"
            "}",
            i,
            DEVICE_ID, i,
            tRelaySet, i,
            tRelayState, i,
            tStatus,
            DEVICE_ID, DEVICE_NAME);
        mqtt.publish(topic, payload, true);
        delay(20);
    }

    // Entradas → binary_sensor
    // device_class sugerido: "door" para puertas, "motion" para PIR,
    // "window" para ventanas. Cambiar según la aplicación.
    const char* inputClasses[] = {
        "door", "door", "motion", "motion",
        "window", "window", "None", "None"
    };
    for (int i = 1; i <= INPUT_COUNT; i++) {
        snprintf(topic, sizeof(topic),
            "homeassistant/binary_sensor/%s_input_%d/config", DEVICE_ID, i);
        snprintf(payload, sizeof(payload),
            "{"
            "\"name\":\"Input %d\","
            "\"uniq_id\":\"%s_i%d\","
            "\"stat_t\":\"%s/%d/state\","
            "\"pl_on\":\"ON\","
            "\"pl_off\":\"OFF\","
            "\"dev_cla\":\"%s\","
            "\"avty_t\":\"%s\","
            "\"pl_avail\":\"online\","
            "\"pl_not_avail\":\"offline\","
            "\"dev\":{"
              "\"ids\":[\"%s\"],"
              "\"name\":\"%s\","
              "\"mf\":\"ESP32 Modular\","
              "\"mdl\":\"CPU S3 Zero\""
            "}"
            "}",
            i,
            DEVICE_ID, i,
            tInputState, i,
            inputClasses[i - 1],
            tStatus,
            DEVICE_ID, DEVICE_NAME);
        mqtt.publish(topic, payload, true);
        delay(20);
    }
}

// ==========================================================
//   MQTT — Recepción de comandos
// ==========================================================

void mqttCallback(char* topic, byte* payload, unsigned int len) {
    char msg[16] = {0};
    memcpy(msg, payload, min(len, (unsigned int)15));

    // Relay set: esp32modular/{id}/relay/{ch}/set
    char* p = strstr(topic, "/relay/");
    if (p) {
        int ch = atoi(p + 7);
        if (strcmp(msg, "ON")    == 0) { setRelay(ch, true);  pubRelayState(ch); }
        if (strcmp(msg, "OFF")   == 0) { setRelay(ch, false); pubRelayState(ch); }
        if (strcmp(msg, "PULSE") == 0) { pulseRelay(ch, 500); pubRelayState(ch); }
        return;
    }

    // Toggle: esp32modular/{id}/relay/{ch}/toggle
    p = strstr(topic, "/toggle");
    if (p) {
        char* q = strstr(topic, "/relay/");
        if (q) {
            int ch = atoi(q + 7);
            setRelay(ch, !getRelay(ch));
            pubRelayState(ch);
        }
    }
}

// ==========================================================
//   MQTT — Conexión
// ==========================================================

bool mqttConnect() {
    if (mqtt.connect(DEVICE_ID, MQTT_USER, MQTT_PASS,
                     tStatus, 1, true, "offline")) {
        // Suscribirse a comandos de relés
        char sub[96];
        snprintf(sub, sizeof(sub), "%s/+/set",    tRelaySet);
        mqtt.subscribe(sub, 1);
        snprintf(sub, sizeof(sub), "%s/+/toggle", tRelaySet);
        mqtt.subscribe(sub, 1);

        mqtt.publish(tStatus, "online", true);
        publishDiscovery();
        pubAllStates();
        return true;
    }
    return false;
}

// ==========================================================
//   OLED — Pantalla de estado
// ==========================================================

void updateOled() {
    if (!oledOk) return;
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);

    // Línea 1: ID del módulo
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.printf("%-12s %s", DEVICE_ID, mqtt.connected() ? "MQ" : "--");

    // Línea 2: IP / estado WiFi
    display.setCursor(0, 11);
    if (WiFi.isConnected())
        display.print(WiFi.localIP().toString());
    else
        display.print("Sin WiFi...");

    // Separador
    display.drawFastHLine(0, 22, 128, SSD1306_WHITE);

    // Línea 3: Estado relés
    display.setCursor(0, 26);
    display.print("R:");
    for (int i = 1; i <= RELAY_COUNT; i++) {
        display.printf("%d%s ", i, getRelay(i) ? "*" : "o");
    }
    if (!relayModuleOk) display.print("?");

    // Línea 4: Estado entradas
    display.setCursor(0, 38);
    display.print("I:");
    if (inputModuleOk) {
        for (int i = 0; i < INPUT_COUNT; i++)
            display.print(!(inputState & (1 << i)) ? "*" : ".");
    } else {
        display.print("no detectado");
    }

    // Línea 5: RSSI WiFi
    display.setCursor(0, 52);
    if (WiFi.isConnected())
        display.printf("WiFi: %d dBm", WiFi.RSSI());

    display.display();
}

// ==========================================================
//   OTA — Configuración
// ==========================================================

void setupOTA() {
    ArduinoOTA.setHostname(DEVICE_ID);
    ArduinoOTA.setPassword(OTA_PASS);

    ArduinoOTA.onStart([]() {
        if (oledOk) {
            display.clearDisplay();
            display.setTextSize(1);
            display.setCursor(0, 0);
            display.println("Actualizando OTA...");
            display.display();
        }
    });

    ArduinoOTA.onProgress([](unsigned int prog, unsigned int total) {
        if (!oledOk) return;
        int pct = prog * 100 / total;
        display.fillRect(0, 20, 128, 20, SSD1306_BLACK);
        display.setCursor(0, 20);
        display.printf("%d%%", pct);
        display.fillRect(0, 32, pct * 128 / 100, 8, SSD1306_WHITE);
        display.display();
    });

    ArduinoOTA.onEnd([]() {
        if (oledOk) {
            display.clearDisplay();
            display.setCursor(0, 0);
            display.println("Listo! Reiniciando...");
            display.display();
        }
    });

    ArduinoOTA.onError([](ota_error_t err) {
        Serial.printf("OTA Error[%u]\n", err);
    });

    ArduinoOTA.begin();
}

// ==========================================================
//   SETUP
// ==========================================================

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n== Sistema Modular ESP32 ==");

    // I2C
    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(400000);

    // OLED
    oledOk = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
    if (oledOk) {
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(0, 0);
        display.println("ESP32 Modular");
        display.setCursor(0, 12);
        display.println("Iniciando...");
        display.display();
    }

    // Detectar módulos I2C
    relayModuleOk = i2cDevicePresent(RELAY_ADDR);
    inputModuleOk = i2cDevicePresent(INPUT_ADDR);
    Serial.printf("Relay module (0x%02X): %s\n", RELAY_ADDR, relayModuleOk ? "OK" : "no detectado");
    Serial.printf("Input module (0x%02X): %s\n", INPUT_ADDR, inputModuleOk ? "OK" : "no detectado");

    // Init relés (todos OFF)
    if (relayModuleOk) applyRelays();

    // Leer estado inicial de entradas
    if (inputModuleOk) {
        pcfRead(INPUT_ADDR, inputState);
        inputPrev = inputState;
    }

    // Construir topics MQTT
    snprintf(tRelaySet,   sizeof(tRelaySet),   "esp32modular/%s/relay", DEVICE_ID);
    snprintf(tRelayState, sizeof(tRelayState),  "esp32modular/%s/relay", DEVICE_ID);
    snprintf(tInputState, sizeof(tInputState),  "esp32modular/%s/input", DEVICE_ID);
    snprintf(tStatus,     sizeof(tStatus),      "esp32modular/%s/status", DEVICE_ID);

    // WiFi
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    Serial.printf("Conectando a %s", WIFI_SSID);

    uint8_t tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 30) {
        delay(500);
        Serial.print(".");
        tries++;
    }
    if (WiFi.isConnected()) {
        Serial.printf("\nIP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\nSin WiFi — reintentando en loop");
    }

    // OTA
    setupOTA();

    // MQTT
    mqtt.setServer(MQTT_HOST, MQTT_PORT);
    mqtt.setCallback(mqttCallback);
    mqtt.setBufferSize(512);
    mqtt.setKeepAlive(30);
    if (WiFi.isConnected()) mqttConnect();

    Serial.println("Setup completo.");
}

// ==========================================================
//   LOOP
// ==========================================================

void loop() {
    unsigned long now = millis();

    // OTA
    ArduinoOTA.handle();

    // WiFi — verificar cada 10s sin bloquear
    if (now - tWifiCheck >= 10000) {
        tWifiCheck = now;
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("WiFi caído, reconectando...");
            WiFi.reconnect();
        }
    }

    // MQTT — reconexión cada 5s si está desconectado
    if (!mqtt.connected() && WiFi.isConnected()) {
        if (now - tReconnect >= 5000) {
            tReconnect = now;
            Serial.println("MQTT reconectando...");
            mqttConnect();
        }
    }
    mqtt.loop();

    // Leer entradas cada 100ms — publicar solo cambios
    if (now - tInputCheck >= 100) {
        tInputCheck = now;
        if (inputModuleOk) {
            uint8_t newState;
            if (pcfRead(INPUT_ADDR, newState)) {
                uint8_t changed = newState ^ inputPrev;
                if (changed && mqtt.connected()) {
                    for (int i = 0; i < INPUT_COUNT; i++) {
                        if (changed & (1 << i)) {
                            bool active = !(newState & (1 << i));
                            pubInputState(i + 1, active);
                            Serial.printf("Input %d: %s\n", i + 1, active ? "ON" : "OFF");
                        }
                    }
                }
                inputPrev  = inputState;
                inputState = newState;
            }
        }
    }

    // OLED cada 500ms
    if (now - tOledUpdate >= 500) {
        tOledUpdate = now;
        updateOled();
    }

    // Heartbeat MQTT cada 60s
    if (now - tHeartbeat >= 60000) {
        tHeartbeat = now;
        if (mqtt.connected())
            mqtt.publish(tStatus, "online", true);
    }
}
