import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditEvent } from '@dbpulse/shared';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/stream' })
export class StreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;
  private readonly logger = new Logger(StreamGateway.name);

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    // Validate JWT on WS handshake
    const token =
      client.handshake.auth?.token ??
      client.handshake.headers?.authorization?.replace('Bearer ', '');
    try {
      if (!token) throw new Error('No token');
      this.jwt.verify(token, { secret: this.config.getOrThrow('JWT_SECRET') });
      this.logger.log(`WS connected: ${client.id}`);
    } catch {
      this.logger.warn(`WS rejected unauthenticated client: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() connectionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`conn:${connectionId}`);
    return { event: 'subscribed', data: { connectionId } };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() connectionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`conn:${connectionId}`);
    return { event: 'unsubscribed', data: { connectionId } };
  }

  broadcast(event: AuditEvent): void {
    // Emit to connection-specific room AND global listeners
    this.server.to(`conn:${event.connectionId}`).emit('audit_event', event);
    this.server.to('global').emit('audit_event', event);
    this.logger.debug(`Broadcast: ${event.operation} on ${event.tableName}`);
  }
}
