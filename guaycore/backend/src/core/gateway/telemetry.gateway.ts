import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface TelemetryEvent {
  tenantId: string;
  deviceId: string;
  ts:       Date;
  data:     Record<string, unknown>;
}

@WebSocketGateway({ cors: true, namespace: '/ws' })
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelemetryGateway.name);

  constructor(
    private readonly jwtSvc: JwtService,
    private readonly cfg:    ConfigService,
  ) {}

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token as string;
    if (!token) { socket.disconnect(); return; }

    try {
      const payload = this.jwtSvc.verify(token, {
        secret: this.cfg.getOrThrow('JWT_ACCESS_SECRET'),
      }) as { tenantId: string };
      socket.data.tenantId = payload.tenantId;
      socket.join(`tenant:${payload.tenantId}`);
      this.logger.log(`WS connected tenant=${payload.tenantId} id=${socket.id}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`WS disconnected id=${socket.id}`);
  }

  // Client subscribes to a specific device
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { deviceId: string },
  ) {
    if (!data?.deviceId) return;
    socket.join(`device:${socket.data.tenantId}:${data.deviceId}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { deviceId: string },
  ) {
    if (!data?.deviceId) return;
    socket.leave(`device:${socket.data.tenantId}:${data.deviceId}`);
  }

  // Forward telemetry to subscribed clients
  @OnEvent('telemetry.received')
  handleTelemetryEvent(event: TelemetryEvent) {
    this.server
      .to(`device:${event.tenantId}:${event.deviceId}`)
      .emit('telemetry', {
        deviceId: event.deviceId,
        ts:       event.ts,
        data:     event.data,
      });
  }
}
