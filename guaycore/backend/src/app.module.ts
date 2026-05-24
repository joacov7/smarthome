import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

// ── Core modules ──────────────────────────────────────────────
import { AuthModule }          from './core/auth/auth.module';
import { OrganizationsModule } from './core/organizations/organizations.module';
import { UsersModule }         from './core/users/users.module';
import { DevicesModule }       from './core/devices/devices.module';
import { TelemetryModule }     from './core/telemetry/telemetry.module';
import { EventsModule }        from './core/events/events.module';
import { RulesModule }         from './core/rules/rules.module';
import { AlertsModule }        from './core/alerts/alerts.module';
import { OtaModule }           from './core/ota/ota.module';
import { MqttModule }          from './core/mqtt/mqtt.module';
import { GatewayModule }       from './core/gateway/gateway.module';

// ── Vertical modules ─────────────────────────────────────────
import { GuayHomeModule }     from './verticals/guayhome/guayhome.module';
import { LogiguayModule }     from './verticals/logiguay/logiguay.module';

// ── Shared ────────────────────────────────────────────────────
import { JwtAuthGuard }           from './shared/guards/jwt-auth.guard';
import { RolesGuard }             from './shared/guards/roles.guard';
import { GlobalExceptionFilter }  from './shared/filters/global-exception.filter';

// ── Entities (todas para TypeORM) ────────────────────────────
import { Organization }    from './core/organizations/entities/organization.entity';
import { User }            from './core/users/entities/user.entity';
import { Device }          from './core/devices/entities/device.entity';
import { Telemetry }       from './core/telemetry/entities/telemetry.entity';
import { DeviceEvent }     from './core/events/entities/event.entity';
import { Rule }            from './core/rules/entities/rule.entity';
import { FirmwareVersion, OtaCampaign } from './core/ota/entities/firmware.entity';
import { Alert } from './core/alerts/entities/alert.entity';

@Module({
  imports: [
    // ── Config global ──────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal:   true,
      envFilePath: ['.env.local', '.env', '../.env'],
    }),

    // ── Global event emitter (internal pub/sub) ───────────
    EventEmitterModule.forRoot({ wildcard: false }),

    // ── TypeORM + PostgreSQL ──────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type:        'postgres',
        url:          cfg.get<string>('DATABASE_URL'),
        entities:    [
          Organization, User, Device, Telemetry,
          DeviceEvent, Rule, Alert, FirmwareVersion, OtaCampaign,
        ],
        synchronize: false,   // NUNCA true en producción — usar migraciones SQL
        logging:     cfg.get('NODE_ENV') === 'development' ? ['error','warn'] : false,
        ssl:         cfg.get('NODE_ENV') === 'production'
                       ? { rejectUnauthorized: false }
                       : false,
      }),
    }),

    // ── Core ──────────────────────────────────────────────
    MqttModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    DevicesModule,
    TelemetryModule,
    EventsModule,
    RulesModule,
    AlertsModule,
    OtaModule,

    // ── WebSocket gateway ─────────────────────────────────
    GatewayModule,

    // ── Verticales ─────────────────────────────────────────
    GuayHomeModule,
    LogiguayModule,
  ],

  providers: [
    // Guards globales — aplican a todos los endpoints
    { provide: APP_GUARD,  useClass: JwtAuthGuard },
    { provide: APP_GUARD,  useClass: RolesGuard },
    // Exception filter global
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
