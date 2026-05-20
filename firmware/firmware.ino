/*
 * Sistema Modular ESP32 — Firmware CPU
 * Hardware: Waveshare ESP32-S3 Zero
 *
 * Funcionalidades:
 *   - Portal de configuración captivo (AP mode, primer arranque)
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
 *   (DNSServer, WebServer, Preferences: incluidas en ESP32 Arduino core)
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
#include "config.h"   // pines I2C, direcciones I2C, RELAY_ACTIVE_LOW
#include "storage.h"  // struct Config + NVS helpers
#include "portal.h"   // captive portal AP + config web UI

// ── Modo de operación ─────────────────────────────────────
static bool portalMode = false;

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
unsigned long tInputCheck = 0;
unsigned long tOledUpdate = 0;
unsigned long tHeartbeat  = 0;
unsigned long tReconnect  = 0;
unsigned long tWifiCheck  = 0;

// ── Auto-off de relés en modo PULSE / TIMER ──────────────
// Valor: millis() cuando se debe apagar. 0 = sin pendiente.
unsigned long relayAutoOff[RELAY_MAX] = {};

// ── Topics MQTT (construidos en setup) ───────────────────
char tRelaySet[80];
char tRelayState[80];
char tInputState[80];
char tStatus[64];

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
    if (ch < 1 || ch > cfg.relayCount) return;
    uint8_t bit = ch - 1;
    bool active = RELAY_ACTIVE_LOW ? !on : on;
    if (active) relayState |=  (1 << bit);
    else        relayState &= ~(1 << bit);
    applyRelays();
}

bool getRelay(uint8_t ch) {
    if (ch < 1 || ch > cfg.relayCount) return false;
    uint8_t bit = ch - 1;
    bool active = relayState & (1 << bit);
    return RELAY_ACTIVE_LOW ? !active : active;
}

// ==========================================================
//   MQTT — Publicación
// ==========================================================

void pubRelayState(uint8_t ch) {
    char topic[96];
    snprintf(topic, sizeof(topic), "%s/%d/state", tRelayState, ch);
    mqtt.publish(topic, getRelay(ch) ? "ON" : "OFF", true);
}

void pubInputState(uint8_t ch, bool rawActive) {
    char topic[96];
    // Aplicar inversión NC/NO según configuración del canal
    bool state = cfg.input[ch - 1].inverted ? !rawActive : rawActive;
    snprintf(topic, sizeof(topic), "%s/%d/state", tInputState, ch);
    mqtt.publish(topic, state ? "ON" : "OFF", true);
}

void pubAllStates() {
    for (int i = 1; i <= cfg.relayCount; i++) pubRelayState(i);
    for (int i = 1; i <= cfg.inputCount; i++)
        pubInputState(i, !(inputState & (1 << (i - 1))));
}

// ==========================================================
//   MQTT — Home Assistant Auto-Discovery
// ==========================================================

void publishDiscovery() {
    char topic[128], payload[620];

    // Dominios HA según tipo de dispositivo → HomeKit muestra ícono correcto
    // switch → interruptor  light → lámpara  fan → ventilador
    static const char* HA_DOMAINS[] = { "switch", "light", "fan" };

    // Relés
    for (int i = 1; i <= cfg.relayCount; i++) {
        uint8_t ht = cfg.relay[i - 1].haType;
        if (ht > 2) ht = 0;
        snprintf(topic, sizeof(topic),
            "homeassistant/%s/%s_relay_%d/config", HA_DOMAINS[ht], cfg.deviceId, i);
        snprintf(payload, sizeof(payload),
            "{"
            "\"name\":\"%s\","
            "\"uniq_id\":\"%s_r%d\","
            "\"cmd_t\":\"%s/%d/set\","
            "\"stat_t\":\"%s/%d/state\","
            "\"pl_on\":\"ON\","
            "\"pl_off\":\"OFF\","
            "\"ret\":true,"
            "\"suggested_area\":\"%s\","
            "\"avty_t\":\"%s\","
            "\"pl_avail\":\"online\","
            "\"pl_not_avail\":\"offline\","
            "\"dev\":{\"ids\":[\"%s\"],\"name\":\"%s\","
              "\"mf\":\"ESP32 Modular\",\"mdl\":\"CPU S3 Zero\"}"
            "}",
            cfg.relay[i - 1].name,
            cfg.deviceId, i,
            tRelaySet,   i,
            tRelayState, i,
            cfg.area,
            tStatus,
            cfg.deviceId, cfg.deviceName);
        mqtt.publish(topic, payload, true);
        delay(20);
    }

    // Entradas → binary_sensor
    for (int i = 1; i <= cfg.inputCount; i++) {
        const char* hac = cfg.input[i - 1].haClass;
        bool hasClass = strcmp(hac, "None") != 0 && strlen(hac) > 0;
        snprintf(topic, sizeof(topic),
            "homeassistant/binary_sensor/%s_input_%d/config", cfg.deviceId, i);
        if (hasClass) {
            snprintf(payload, sizeof(payload),
                "{"
                "\"name\":\"%s\","
                "\"uniq_id\":\"%s_i%d\","
                "\"stat_t\":\"%s/%d/state\","
                "\"pl_on\":\"ON\",\"pl_off\":\"OFF\","
                "\"dev_cla\":\"%s\","
                "\"suggested_area\":\"%s\","
                "\"avty_t\":\"%s\","
                "\"pl_avail\":\"online\","
                "\"pl_not_avail\":\"offline\","
                "\"dev\":{\"ids\":[\"%s\"],\"name\":\"%s\","
                  "\"mf\":\"ESP32 Modular\",\"mdl\":\"CPU S3 Zero\"}"
                "}",
                cfg.input[i - 1].name,
                cfg.deviceId, i,
                tInputState, i,
                hac,
                cfg.area,
                tStatus,
                cfg.deviceId, cfg.deviceName);
        } else {
            snprintf(payload, sizeof(payload),
                "{"
                "\"name\":\"%s\","
                "\"uniq_id\":\"%s_i%d\","
                "\"stat_t\":\"%s/%d/state\","
                "\"pl_on\":\"ON\",\"pl_off\":\"OFF\","
                "\"suggested_area\":\"%s\","
                "\"avty_t\":\"%s\","
                "\"pl_avail\":\"online\","
                "\"pl_not_avail\":\"offline\","
                "\"dev\":{\"ids\":[\"%s\"],\"name\":\"%s\","
                  "\"mf\":\"ESP32 Modular\",\"mdl\":\"CPU S3 Zero\"}"
                "}",
                cfg.input[i - 1].name,
                cfg.deviceId, i,
                tInputState, i,
                cfg.area,
                tStatus,
                cfg.deviceId, cfg.deviceName);
        }
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
        if (ch < 1 || ch > cfg.relayCount) return;
        uint8_t  mode = cfg.relay[ch - 1].mode;
        uint16_t ms   = cfg.relay[ch - 1].pulseMs;

        if (strcmp(msg, "ON") == 0) {
            setRelay(ch, true);
            if (mode == MODE_PULSE || mode == MODE_TIMER)
                relayAutoOff[ch - 1] = millis() + ms;
            pubRelayState(ch);
        } else if (strcmp(msg, "OFF") == 0) {
            setRelay(ch, false);
            relayAutoOff[ch - 1] = 0;
            pubRelayState(ch);
        } else if (strcmp(msg, "PULSE") == 0) {
            setRelay(ch, true);
            relayAutoOff[ch - 1] = millis() + ms;
            pubRelayState(ch);
        }
        return;
    }

    // Toggle: esp32modular/{id}/relay/{ch}/toggle
    p = strstr(topic, "/toggle");
    if (p) {
        char* q = strstr(topic, "/relay/");
        if (!q) return;
        int ch = atoi(q + 7);
        if (ch < 1 || ch > cfg.relayCount) return;
        bool newOn = !getRelay(ch);
        setRelay(ch, newOn);
        if (newOn && (cfg.relay[ch - 1].mode == MODE_PULSE || cfg.relay[ch - 1].mode == MODE_TIMER))
            relayAutoOff[ch - 1] = millis() + cfg.relay[ch - 1].pulseMs;
        else
            relayAutoOff[ch - 1] = 0;
        pubRelayState(ch);
    }
}

// ==========================================================
//   MQTT — Conexión
// ==========================================================

bool mqttConnect() {
    if (mqtt.connect(cfg.deviceId, cfg.mqttUser, cfg.mqttPass,
                     tStatus, 1, true, "offline")) {
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
//   OLED — Pantalla de estado normal
// ==========================================================

void updateOled() {
    if (!oledOk) return;
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);

    display.setCursor(0, 0);
    display.printf("%-12s %s", cfg.deviceId, mqtt.connected() ? "MQ" : "--");

    display.setCursor(0, 11);
    if (WiFi.isConnected())
        display.print(WiFi.localIP().toString());
    else
        display.print("Sin WiFi...");

    display.drawFastHLine(0, 22, 128, SSD1306_WHITE);

    display.setCursor(0, 26);
    display.print("R:");
    for (int i = 1; i <= cfg.relayCount; i++)
        display.printf("%d%s ", i, getRelay(i) ? "*" : "o");
    if (!relayModuleOk) display.print("?");

    display.setCursor(0, 38);
    display.print("I:");
    if (inputModuleOk) {
        for (int i = 0; i < cfg.inputCount; i++)
            display.print(!(inputState & (1 << i)) ? "*" : ".");
    } else {
        display.print("no detectado");
    }

    display.setCursor(0, 52);
    if (WiFi.isConnected())
        display.printf("WiFi: %d dBm", WiFi.RSSI());

    display.display();
}

// OLED — Pantalla de portal captivo
void oledPortal(const String& apName) {
    if (!oledOk) return;
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("MODO CONFIGURACION");
    display.drawFastHLine(0, 10, 128, SSD1306_WHITE);
    display.setCursor(0, 14);
    display.println("Conectar a WiFi:");
    display.setCursor(0, 24);
    display.println(apName);
    display.setCursor(0, 38);
    display.println("Luego abrir:");
    display.setCursor(0, 48);
    display.println("192.168.4.1");
    display.display();
}

// ==========================================================
//   OTA — Configuración
// ==========================================================

void setupOTA() {
    ArduinoOTA.setHostname(cfg.deviceId);
    ArduinoOTA.setPassword(cfg.otaPass);

    ArduinoOTA.onStart([]() {
        if (!oledOk) return;
        display.clearDisplay();
        display.setTextSize(1);
        display.setCursor(0, 0);
        display.println("Actualizando OTA...");
        display.display();
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
        if (!oledOk) return;
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("Listo! Reiniciando...");
        display.display();
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

    // Cargar configuración desde NVS (o defaults si es la primera vez)
    configLoad();
    Serial.printf("Device: %s  Configurado: %s\n",
                  cfg.deviceId, cfg.configured ? "SI" : "NO");

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
    Serial.printf("Relay (0x%02X): %s\n", RELAY_ADDR, relayModuleOk ? "OK" : "no detectado");
    Serial.printf("Input (0x%02X): %s\n", INPUT_ADDR, inputModuleOk ? "OK" : "no detectado");

    if (relayModuleOk) applyRelays();
    if (inputModuleOk) { pcfRead(INPUT_ADDR, inputState); inputPrev = inputState; }

    // ── Modo portal: arranca sin configuración guardada ───
    if (!cfg.configured) {
        portalMode = true;
        String apName = "ESP32-";
        apName += cfg.deviceId;
        Serial.printf("Portal: SSID=%s  IP=192.168.4.1\n", apName.c_str());
        oledPortal(apName);
        portalBegin();
        return;
    }

    // ── Modo normal ───────────────────────────────────────
    snprintf(tRelaySet,   sizeof(tRelaySet),   "esp32modular/%s/relay", cfg.deviceId);
    snprintf(tRelayState, sizeof(tRelayState),  "esp32modular/%s/relay", cfg.deviceId);
    snprintf(tInputState, sizeof(tInputState),  "esp32modular/%s/input", cfg.deviceId);
    snprintf(tStatus,     sizeof(tStatus),      "esp32modular/%s/status", cfg.deviceId);

    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(cfg.wifiSSID, cfg.wifiPass);
    Serial.printf("Conectando a %s", cfg.wifiSSID);
    uint8_t tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 30) {
        delay(500); Serial.print("."); tries++;
    }
    Serial.println(WiFi.isConnected()
        ? ("\nIP: " + WiFi.localIP().toString()).c_str()
        : "\nSin WiFi — reintentando en loop");

    setupOTA();

    mqtt.setServer(cfg.mqttHost, cfg.mqttPort);
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
    // Portal mode: ceder el control al servidor web
    if (portalMode) {
        portalLoop();
        return;
    }

    unsigned long now = millis();

    // OTA
    ArduinoOTA.handle();

    // Auto-off de relés en modo PULSE / TIMER (no bloqueante)
    for (int i = 0; i < cfg.relayCount; i++) {
        if (relayAutoOff[i] && now >= relayAutoOff[i]) {
            relayAutoOff[i] = 0;
            setRelay(i + 1, false);
            if (mqtt.connected()) pubRelayState(i + 1);
        }
    }

    // WiFi — verificar cada 10s
    if (now - tWifiCheck >= 10000) {
        tWifiCheck = now;
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("WiFi caído, reconectando...");
            WiFi.reconnect();
        }
    }

    // MQTT — reconexión cada 5s
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
                    for (int i = 0; i < cfg.inputCount; i++) {
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
        if (mqtt.connected()) mqtt.publish(tStatus, "online", true);
    }
}
