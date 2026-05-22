#pragma once

// ==========================================================
//   CONFIGURACIÓN — editar estos valores antes de flashear
// ==========================================================

// ── WiFi ──────────────────────────────────────────────────
#define WIFI_SSID     "tu_red_wifi"
#define WIFI_PASS     "tu_contraseña_wifi"

// ── MQTT Broker ───────────────────────────────────────────
// Si usás Home Assistant con el add-on Mosquitto:
//   Host = IP de tu Home Assistant (ej: 192.168.1.100)
//   User/Pass = los del add-on Mosquitto
#define MQTT_HOST     "192.168.1.100"
#define MQTT_PORT     1883
#define MQTT_USER     "mqtt_usuario"
#define MQTT_PASS     "mqtt_contraseña"

// ── Identificación del módulo ─────────────────────────────
// DEVICE_ID debe ser único por módulo instalado
// Ejemplos: "alarma_01", "bomba_garage", "porton_frente"
#define DEVICE_ID     "modulo_01"
#define DEVICE_NAME   "Módulo 01"

// ── OTA (actualización por WiFi) ─────────────────────────
#define OTA_PASS      "esp32ota"

// ── I2C — Waveshare ESP32-S3 Zero ────────────────────────
#define I2C_SDA       8
#define I2C_SCL       9

// ── Direcciones I2C de los módulos ───────────────────────
// Relés 4CH:    PCF8574  → 0x20 (A0=A1=A2=GND)
// Entradas 8CH: PCF8574A → 0x38 (A0=A1=A2=GND)
// Si no tenés algún módulo, comentar la línea correspondiente
#define RELAY_ADDR    0x20
#define INPUT_ADDR    0x38

// ── Canales activos ───────────────────────────────────────
#define RELAY_COUNT   4    // 4 u 8 según tu módulo
#define INPUT_COUNT   8    // 8 entradas

// ── OLED ─────────────────────────────────────────────────
#define OLED_ADDR     0x3C  // 0x3C más común, algunos son 0x3D

// ── Lógica de relés ───────────────────────────────────────
// true  = PCF8574 LOW activa el relé (módulos con optoacoplador)
// false = PCF8574 HIGH activa el relé
#define RELAY_ACTIVE_LOW  true
