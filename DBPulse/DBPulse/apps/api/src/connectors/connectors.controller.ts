import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ConnectorsService } from './connectors.service';
import { ReconnectService } from './reconnect.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { CreateConnectionDto } from './dto/create-connection.dto';

@Controller('connections')
export class ConnectorsController {
  constructor(
    private readonly connectors: ConnectorsService,
    private readonly reconnect: ReconnectService,
    private readonly pipeline: PipelineService,
  ) {}

  @Get()
  list() { return this.connectors.listConnections(); }

  @Post()
  create(@Body() dto: CreateConnectionDto) {
    return this.connectors.createConnection(dto as any);
  }

  @Post(':id/connect')
  async connect(@Param('id') id: string) {
    await this.connectors.connect(id, async (event) => {
      await this.pipeline.publish(event);
    });
    return { status: 'connected', connectionId: id };
  }

  @Delete(':id/connect')
  async disconnect(@Param('id') id: string) {
    this.reconnect.cancel(id);  // stop any pending reconnect
    await this.connectors.disconnect(id);
    return { status: 'disconnected', connectionId: id };
  }

  @Get(':id/reconnect-state')
  reconnectState(@Param('id') id: string) {
    return this.reconnect.getState(id) ?? { connectionId: id, status: 'not-scheduled' };
  }
}
