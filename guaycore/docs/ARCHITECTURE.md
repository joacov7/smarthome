# GuayCore — Arquitectura

## Stack

| Capa | Tecnología | Motivo |
|---|---|---|
| Backend | NestJS + TypeScript | Modular, DI nativo, decorators |
| Base de datos | PostgreSQL 15 + **TimescaleDB** | Time-series nativo, compresión 90% |
| Cache / Queues | Redis + **BullMQ** | Backpressure, retry, delayed jobs |
| MQTT Broker | **EMQX 5** | Cluster nativo, millones de conexiones |
| Frontend | Next.js 14 | SSR, App Router, DX |
| Mobile | Flutter | Un código, iOS + Android |
| Firmware | ESP32 / ESP-IDF + PlatformIO | FreeRTOS, modular |

## Topic Schema MQTT

```
guay/{tenantId}/device/{deviceId}/telemetry   ← dispositivo publica (QoS 1)
guay/{tenantId}/device/{deviceId}/events      ← dispositivo publica (QoS 1)
guay/{tenantId}/device/{deviceId}/status      ← LWT del dispositivo (QoS 1, retained)
guay/{tenantId}/device/{deviceId}/commands    → backend publica (QoS 1)
guay/{tenantId}/device/{deviceId}/config      → backend publica (QoS 1, retained)
guay/{tenantId}/device/{deviceId}/ota         → backend publica (QoS 1)
```

**QoS:**
- Telemetría → QoS 1 (at-least-once): toleramos duplicados, no perdemos datos
- Comandos → QoS 1 + ACK del dispositivo: confirmamos ejecución
- Config → QoS 1 + retained: el dispositivo recibe config al reconectar

**LWT (Last Will Testament):** cada dispositivo se conecta con un LWT que publica `offline` en `/status`. El backend lo detecta y actualiza el estado en la DB.

## Telemetría — Flujo de ingesta

```
Dispositivo → EMQX → Backend (MQTT handler) → BullMQ Queue → Worker → TimescaleDB
                                                                     ↓
                                                               Rules Engine
                                                                     ↓
                                                         Alerts / Commands / Webhooks
```

El queue desacopla la ingesta del procesamiento: EMQX puede recibir 100k msg/s; el worker procesa a su propio ritmo sin backpressure en el broker.

## Multi-tenant Isolation

- **Columna `tenant_id`** en todas las tablas — nunca compartida
- **Guards** en NestJS: todo endpoint extrae `tenantId` del JWT y filtra automáticamente
- **EMQX**: auth via HTTP hook contra el backend — el dispositivo solo puede publicar en `guay/{suTenantId}/*`
- **Futuro**: PostgreSQL Row Level Security (RLS) como capa adicional

## Escala

| Dispositivos | Arquitectura |
|---|---|
| 0–1.000 | 1 backend, 1 EMQX, 1 Postgres+Timescale, 1 Redis |
| 1.000–20.000 | 2–3 backends (load balancer), EMQX cluster 2 nodos, Postgres replica |
| 20.000–100.000 | EMQX cluster 4+ nodos, Postgres + PgBouncer, Redis Cluster, separar workers de API |
| 100.000+ | Considerar NATS JetStream para telemetría, sharding por tenant, Kafka |

## Vertical Modules

Cada vertical extiende el core sin modificarlo:
- Define sus entidades específicas
- Registra sus handlers de telemetría
- Agrega sus rules conditions/actions
- Expone sus endpoints bajo `/api/v1/{vertical}/`

```
core/              → nunca toca lógica de negocio de verticales
verticals/
  guayhome/        → luces, cerraduras, clima, escenas
  logiguay/        → GPS, choferes, viajes, geocercas
  guaycold/        → temperatura, HACCP, compresores
  guaywater/       → TDS, presión, bombas, tanques
  guayenergy/      → consumo, solar, generadores
  guayindustry/    → PLC, Modbus, OEE, predictivo
```
