import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rule, RuleCondition, RuleAction } from './entities/rule.entity';
import { RuleConditionOperator, RuleActionType } from '../../shared/types';

// ============================================================
//  GuayCore Rules Engine
//
//  Evalúa reglas configurables contra telemetría en tiempo real.
//
//  Ejemplo de regla:
//  {
//    conditions: [{ field: 'temp', operator: 'gt', value: 30 }],
//    actions: [{ type: 'send_alert', params: { message: 'Temp alta' } }]
//  }
//
//  Se llama desde el TelemetryService al recibir cada payload MQTT.
// ============================================================

export interface RuleEvalContext {
  tenantId: string;
  deviceId: string;
  data:     Record<string, unknown>;
  ts:       Date;
}

@Injectable()
export class RulesEngine {
  private readonly logger = new Logger(RulesEngine.name);

  // Cache de reglas por tenant — se invalida cuando cambian las reglas
  private readonly cache = new Map<string, { rules: Rule[]; loadedAt: number }>();
  private readonly CACHE_TTL_MS = 30_000; // 30 segundos

  constructor(
    @InjectRepository(Rule)
    private readonly rulesRepo: Repository<Rule>,
  ) {}

  // ── Punto de entrada principal ─────────────────────────────
  async evaluate(ctx: RuleEvalContext): Promise<void> {
    const rules = await this.getRules(ctx.tenantId);
    const applicable = rules.filter(r => this.appliesToDevice(r, ctx.deviceId));

    for (const rule of applicable) {
      if (this.isOnCooldown(rule)) continue;

      const triggered = this.evalConditions(rule, ctx.data);
      if (!triggered) continue;

      this.logger.log(`Regla disparada: [${rule.name}] device=${ctx.deviceId}`);
      await this.executeActions(rule, ctx);
      await this.markTriggered(rule);
    }
  }

  // ── Evaluación de condiciones ──────────────────────────────
  private evalConditions(rule: Rule, data: Record<string, unknown>): boolean {
    const results = rule.conditions.map(c => this.evalCondition(c, data));
    return rule.conditionLogic === 'or'
      ? results.some(Boolean)
      : results.every(Boolean);
  }

  private evalCondition(cond: RuleCondition, data: Record<string, unknown>): boolean {
    const actual = this.resolvePath(cond.field, data);
    if (actual === undefined) return false;

    const expected = cond.value;

    switch (cond.operator) {
      case RuleConditionOperator.GT:  return Number(actual) >  Number(expected);
      case RuleConditionOperator.GTE: return Number(actual) >= Number(expected);
      case RuleConditionOperator.LT:  return Number(actual) <  Number(expected);
      case RuleConditionOperator.LTE: return Number(actual) <= Number(expected);
      case RuleConditionOperator.EQ:  return actual == expected;  // eslint-disable-line
      case RuleConditionOperator.NEQ: return actual != expected;  // eslint-disable-line
      case RuleConditionOperator.CONTAINS:
        return String(actual).includes(String(expected));
      case RuleConditionOperator.CHANGES:
        return true; // TODO: comparar contra valor previo en Redis
      default: return false;
    }
  }

  // ── Acceso a campos anidados: "sensor.temp" → data.sensor.temp ──
  private resolvePath(path: string, data: Record<string, unknown>): unknown {
    return path.split('.').reduce((obj, key) =>
      (obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined), data as unknown);
  }

  // ── Ejecución de acciones ──────────────────────────────────
  private async executeActions(rule: Rule, ctx: RuleEvalContext): Promise<void> {
    for (const action of rule.actions) {
      await this.executeAction(action, rule, ctx);
    }
  }

  private async executeAction(action: RuleAction, rule: Rule, ctx: RuleEvalContext): Promise<void> {
    // Cada acción inyecta el contexto en los params
    const enrichedParams: Record<string, unknown> = {
      ...action.params,
      _deviceId: ctx.deviceId,
      _tenantId: ctx.tenantId,
      _ruleName: rule.name,
      _ts:       ctx.ts.toISOString(),
    };

    switch (action.type) {
      case RuleActionType.SEND_ALERT:
        // AlertsService.create() — inyectar como dependencia circular-safe
        this.logger.warn(`ALERT [${ctx.deviceId}]: ${enrichedParams['message'] ?? rule.name}`);
        // TODO: this.alertsService.create(enrichedParams);
        break;

      case RuleActionType.SEND_COMMAND:
        // MqttService.publish() con el comando
        this.logger.log(`CMD → ${ctx.deviceId}: ${JSON.stringify(enrichedParams['command'])}`);
        // TODO: this.mqttService.publish(ctx.tenantId, ctx.deviceId, 'commands', enrichedParams);
        break;

      case RuleActionType.TRIGGER_WEBHOOK:
        // TODO: HttpService.post(params.url, enrichedParams)
        break;

      case RuleActionType.SEND_EMAIL:
        // TODO: NotificationService.sendEmail(...)
        break;

      case RuleActionType.SEND_TELEGRAM:
        // TODO: NotificationService.sendTelegram(...)
        break;

      default:
        this.logger.warn(`Acción desconocida: ${action.type}`);
    }
  }

  // ── Helpers ────────────────────────────────────────────────
  private appliesToDevice(rule: Rule, deviceId: string): boolean {
    if (!rule.deviceId && !rule.deviceTag) return true;       // aplica a todos
    if (rule.deviceId === deviceId) return true;
    // TODO: resolver tags del dispositivo contra rule.deviceTag
    return false;
  }

  private isOnCooldown(rule: Rule): boolean {
    if (!rule.lastTriggeredAt) return false;
    const elapsed = Date.now() - rule.lastTriggeredAt.getTime();
    return elapsed < rule.cooldownSeconds * 1000;
  }

  private async markTriggered(rule: Rule): Promise<void> {
    rule.lastTriggeredAt = new Date();
    await this.rulesRepo.save(rule);
    // Invalidar cache del tenant
    this.cache.delete(rule.tenantId);
  }

  private async getRules(tenantId: string): Promise<Rule[]> {
    const cached = this.cache.get(tenantId);
    if (cached && Date.now() - cached.loadedAt < this.CACHE_TTL_MS) {
      return cached.rules;
    }
    const rules = await this.rulesRepo.find({
      where: { tenantId, isActive: true },
    });
    this.cache.set(tenantId, { rules, loadedAt: Date.now() });
    return rules;
  }
}
