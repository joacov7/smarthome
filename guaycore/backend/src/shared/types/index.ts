// ============================================================
//  GuayCore — Tipos compartidos del core
// ============================================================

export enum UserRole {
  SUPER_ADMIN = 'super_admin',   // acceso total entre tenants (interno)
  ORG_OWNER   = 'org_owner',     // dueño de organización
  ORG_ADMIN   = 'org_admin',     // admin dentro de una org
  ORG_MEMBER  = 'org_member',    // usuario estándar
  DEVICE      = 'device',        // identidad de dispositivo
  API_KEY     = 'api_key',       // integración externa
}

export enum PlanTier {
  FREE       = 'free',
  STARTER    = 'starter',
  PRO        = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum DeviceStatus {
  ONLINE      = 'online',
  OFFLINE     = 'offline',
  PROVISIONING = 'provisioning',
  SUSPENDED   = 'suspended',
}

export enum EventSeverity {
  INFO     = 'info',
  WARNING  = 'warning',
  ERROR    = 'error',
  CRITICAL = 'critical',
}

export enum RuleConditionOperator {
  GT  = 'gt',   // greater than
  GTE = 'gte',
  LT  = 'lt',
  LTE = 'lte',
  EQ  = 'eq',
  NEQ = 'neq',
  CONTAINS = 'contains',
  CHANGES  = 'changes',  // cualquier cambio de valor
}

export enum RuleActionType {
  SEND_ALERT      = 'send_alert',
  SEND_COMMAND    = 'send_command',
  TRIGGER_WEBHOOK = 'trigger_webhook',
  SEND_EMAIL      = 'send_email',
  SEND_TELEGRAM   = 'send_telegram',
}

// Context que viaja en cada request HTTP autenticado
export interface RequestContext {
  userId:     string;
  tenantId:   string;
  role:       UserRole;
  email:      string;
}

// Payload que va dentro del JWT
export interface JwtPayload {
  sub:      string;  // userId
  tenantId: string;
  role:     UserRole;
  email:    string;
  type:     'access' | 'refresh';
}

// Shape estándar del payload MQTT de telemetría
export interface TelemetryPayload {
  ts?:  number;         // Unix ms — si el dispositivo lo envía
  [key: string]: unknown;
}

// Shape del payload de eventos de dispositivo
export interface DeviceEventPayload {
  type:     string;
  severity: EventSeverity;
  data?:    Record<string, unknown>;
  ts?:      number;
}
