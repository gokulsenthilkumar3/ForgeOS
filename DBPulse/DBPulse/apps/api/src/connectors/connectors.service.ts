import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConnectionConfig, IConnector, encrypt, decrypt } from '@dbpulse/shared';
import { PostgresConnector } from '@dbpulse/connector-postgres';
import { MySQLConnector } from '@dbpulse/connector-mysql';

@Injectable()
export class ConnectorsService {
  private readonly logger = new Logger(ConnectorsService.name);
  private readonly supabase: SupabaseClient;
  private readonly activeConnectors = new Map<string, IConnector>();
  private readonly onEventCallbacks = new Map<string, (e: any) => void>();
  private readonly encSecret: string;

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
    this.encSecret = this.config.getOrThrow('CREDENTIAL_ENCRYPTION_KEY');
  }

  async listConnections() {
    const { data, error } = await this.supabase
      .from('db_connections')
      .select('id, name, engine, host, port, database_name, status, created_at')  // never select credentials
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async createConnection(payload: Omit<ConnectionConfig, 'id'>) {
    const encryptedCredentials = encrypt(
      JSON.stringify({ username: payload.username, password: payload.password }),
      this.encSecret,
    );

    const { data, error } = await this.supabase
      .from('db_connections')
      .insert({
        name: payload.name,
        engine: payload.engine,
        host: payload.host,
        port: payload.port,
        database_name: payload.database,
        credentials: encryptedCredentials,
        status: 'disconnected',
      })
      .select('id, name, engine, host, port, database_name, status, created_at')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async connect(connectionId: string, onEvent: (e: any) => void): Promise<void> {
    const { data, error } = await this.supabase
      .from('db_connections').select('*').eq('id', connectionId).single();
    if (error || !data) throw new NotFoundException(`Connection ${connectionId} not found`);

    const creds = JSON.parse(decrypt(data.credentials, this.encSecret));

    const config: ConnectionConfig = {
      id: data.id,
      name: data.name,
      engine: data.engine,
      host: data.host,
      port: data.port,
      database: data.database_name,
      username: creds.username,
      password: creds.password,
    };

    const connector: IConnector =
      config.engine === 'postgres'
        ? new PostgresConnector(config)
        : new MySQLConnector(config);

    await connector.connect();
    await connector.startListening(onEvent);

    this.activeConnectors.set(connectionId, connector);
    this.onEventCallbacks.set(connectionId, onEvent);

    await this.supabase
      .from('db_connections').update({ status: 'connected' }).eq('id', connectionId);
    this.logger.log(`Connector active: ${connectionId} (${config.engine})`);
  }

  async disconnect(connectionId: string): Promise<void> {
    const connector = this.activeConnectors.get(connectionId);
    if (!connector) return;
    await connector.stopListening();
    await connector.disconnect();
    this.activeConnectors.delete(connectionId);
    this.onEventCallbacks.delete(connectionId);
    await this.supabase
      .from('db_connections').update({ status: 'disconnected' }).eq('id', connectionId);
    this.logger.log(`Connector removed: ${connectionId}`);
  }

  getActiveConnector(connectionId: string): IConnector | undefined {
    return this.activeConnectors.get(connectionId);
  }

  getOnEventCallback(connectionId: string): ((e: any) => void) | undefined {
    return this.onEventCallbacks.get(connectionId);
  }

  getAllActiveIds(): string[] {
    return [...this.activeConnectors.keys()];
  }
}
