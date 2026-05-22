import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RulesEngine, RuleEvalContext } from './rules.engine';
import { Rule } from './entities/rule.entity';
import { RuleConditionOperator, RuleActionType } from '../../shared/types';

// ── Helpers ───────────────────────────────────────────────
function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id:             'rule-1',
    tenantId:       'tenant-1',
    name:           'Test Rule',
    deviceId:       undefined,
    deviceTag:      undefined,
    conditions:     [],
    conditionLogic: 'and',
    actions:        [],
    cooldownSeconds: 0,
    lastTriggeredAt: undefined,
    isActive:       true,
    createdAt:      new Date(),
    updatedAt:      new Date(),
    ...overrides,
  } as Rule;
}

function makeCtx(data: Record<string, unknown> = {}): RuleEvalContext {
  return {
    tenantId: 'tenant-1',
    deviceId: 'device-1',
    data,
    ts:       new Date(),
  };
}

// ── Repo mock ─────────────────────────────────────────────
function mockRepo(rules: Rule[]) {
  return {
    find: jest.fn().mockResolvedValue(rules),
    save: jest.fn().mockImplementation((r: Rule) => Promise.resolve(r)),
  } as unknown as Repository<Rule>;
}

// ==========================================================
describe('RulesEngine', () => {
  let engine: RulesEngine;
  let repo:   jest.Mocked<Repository<Rule>>;

  async function buildEngine(rules: Rule[]) {
    repo = mockRepo(rules) as any;
    const mod = await Test.createTestingModule({
      providers: [
        RulesEngine,
        { provide: getRepositoryToken(Rule), useValue: repo },
      ],
    }).compile();
    engine = mod.get(RulesEngine);
  }

  // ── Condition: GT ─────────────────────────────────────
  describe('condition GT', () => {
    it('fires when value exceeds threshold', async () => {
      const rule = makeRule({
        conditions: [{ field: 'temp', operator: RuleConditionOperator.GT, value: 30 }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: { message: 'hot' } }],
      });
      await buildEngine([rule]);
      await expect(engine.evaluate(makeCtx({ temp: 35 }))).resolves.toBeUndefined();
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'rule-1' }));
    });

    it('does not fire when value is below threshold', async () => {
      const rule = makeRule({
        conditions: [{ field: 'temp', operator: RuleConditionOperator.GT, value: 30 }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ temp: 25 }));
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // ── Condition: GTE ────────────────────────────────────
  describe('condition GTE', () => {
    it('fires at exact threshold', async () => {
      const rule = makeRule({
        conditions: [{ field: 'volt', operator: RuleConditionOperator.GTE, value: 12 }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ volt: 12 }));
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── Condition: LT ─────────────────────────────────────
  describe('condition LT', () => {
    it('fires when value falls below threshold', async () => {
      const rule = makeRule({
        conditions: [{ field: 'battery', operator: RuleConditionOperator.LT, value: 20 }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ battery: 15 }));
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── Condition: EQ ─────────────────────────────────────
  describe('condition EQ', () => {
    it('fires on string equality', async () => {
      const rule = makeRule({
        conditions: [{ field: 'status', operator: RuleConditionOperator.EQ, value: 'alarm' }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ status: 'alarm' }));
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── Condition: NEQ ────────────────────────────────────
  describe('condition NEQ', () => {
    it('fires when value differs', async () => {
      const rule = makeRule({
        conditions: [{ field: 'mode', operator: RuleConditionOperator.NEQ, value: 'standby' }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ mode: 'active' }));
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── Condition: CONTAINS ───────────────────────────────
  describe('condition CONTAINS', () => {
    it('fires when string contains substring', async () => {
      const rule = makeRule({
        conditions: [{ field: 'msg', operator: RuleConditionOperator.CONTAINS, value: 'err' }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ msg: 'device error detected' }));
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── Condition logic: OR ───────────────────────────────
  describe('conditionLogic OR', () => {
    it('fires when any condition matches', async () => {
      const rule = makeRule({
        conditionLogic: 'or',
        conditions: [
          { field: 'temp',    operator: RuleConditionOperator.GT, value: 40 },
          { field: 'battery', operator: RuleConditionOperator.LT, value: 10 },
        ],
        actions: [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      // Only battery matches
      await engine.evaluate(makeCtx({ temp: 20, battery: 5 }));
      expect(repo.save).toHaveBeenCalled();
    });

    it('does not fire when no condition matches', async () => {
      const rule = makeRule({
        conditionLogic: 'or',
        conditions: [
          { field: 'temp',    operator: RuleConditionOperator.GT, value: 40 },
          { field: 'battery', operator: RuleConditionOperator.LT, value: 10 },
        ],
        actions: [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ temp: 20, battery: 50 }));
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // ── Condition logic: AND ──────────────────────────────
  describe('conditionLogic AND', () => {
    it('requires all conditions to match', async () => {
      const rule = makeRule({
        conditionLogic: 'and',
        conditions: [
          { field: 'temp',    operator: RuleConditionOperator.GT, value: 30 },
          { field: 'humidity', operator: RuleConditionOperator.GT, value: 80 },
        ],
        actions: [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      // Only temp matches
      await engine.evaluate(makeCtx({ temp: 35, humidity: 60 }));
      expect(repo.save).not.toHaveBeenCalled();

      jest.clearAllMocks();

      // Both match
      await engine.evaluate(makeCtx({ temp: 35, humidity: 85 }));
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── Nested field path ─────────────────────────────────
  describe('nested field path', () => {
    it('resolves sensor.temp', async () => {
      const rule = makeRule({
        conditions: [{ field: 'sensor.temp', operator: RuleConditionOperator.GT, value: 30 }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ sensor: { temp: 35 } }));
      expect(repo.save).toHaveBeenCalled();
    });

    it('does not fire when nested field is missing', async () => {
      const rule = makeRule({
        conditions: [{ field: 'sensor.temp', operator: RuleConditionOperator.GT, value: 30 }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ sensor: {} }));
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // ── Cooldown ──────────────────────────────────────────
  describe('cooldown', () => {
    it('skips rule that was triggered recently', async () => {
      const rule = makeRule({
        conditions:      [{ field: 'temp', operator: RuleConditionOperator.GT, value: 30 }],
        actions:         [{ type: RuleActionType.SEND_ALERT, params: {} }],
        cooldownSeconds: 300,
        lastTriggeredAt: new Date(Date.now() - 60_000), // 1 min ago
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ temp: 35 }));
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('triggers rule after cooldown expires', async () => {
      const rule = makeRule({
        conditions:      [{ field: 'temp', operator: RuleConditionOperator.GT, value: 30 }],
        actions:         [{ type: RuleActionType.SEND_ALERT, params: {} }],
        cooldownSeconds: 60,
        lastTriggeredAt: new Date(Date.now() - 120_000), // 2 min ago
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ temp: 35 }));
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── Device filter ─────────────────────────────────────
  describe('device filter', () => {
    it('skips rule targeting a different device', async () => {
      const rule = makeRule({
        deviceId:   'device-99',
        conditions: [{ field: 'temp', operator: RuleConditionOperator.GT, value: 30 }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ temp: 35 })); // ctx.deviceId = 'device-1'
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('applies rule with no device filter to any device', async () => {
      const rule = makeRule({
        deviceId:   undefined,
        conditions: [{ field: 'temp', operator: RuleConditionOperator.GT, value: 30 }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);
      await engine.evaluate(makeCtx({ temp: 35 }));
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── Cache invalidation ────────────────────────────────
  describe('cache', () => {
    it('invalidates tenant cache after rule triggers', async () => {
      const rule = makeRule({
        conditions: [{ field: 'x', operator: RuleConditionOperator.EQ, value: 1 }],
        actions:    [{ type: RuleActionType.SEND_ALERT, params: {} }],
      });
      await buildEngine([rule]);

      await engine.evaluate(makeCtx({ x: 1 }));
      expect(repo.find).toHaveBeenCalledTimes(1);

      // Second call: cache was invalidated after trigger, so re-loads
      await engine.evaluate(makeCtx({ x: 1 }));
      expect(repo.find).toHaveBeenCalledTimes(2);
    });
  });
});
