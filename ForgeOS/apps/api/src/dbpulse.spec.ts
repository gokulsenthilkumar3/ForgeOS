import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { compareDbSnapshots, decimalKey, type DbMapping, type DbSnapshot } from './dbpulse-engine';
import { addressClass, resolveDbHost } from './dbpulse-network';
import { DbPulseService } from './dbpulse.service';
import { DbPulseController } from './dbpulse.controller';
import { lookup } from 'node:dns/promises';
jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));
const columns = [{ name: 'id', type: 'integer', nullable: false, primary: true }, { name: 'value', type: 'text', nullable: true, primary: false }];
const mapping: DbMapping[] = [{ left: 'id', right: 'id', mode: 'numeric', key: true }, { left: 'value', right: 'value', mode: 'text', key: false }];
const snapshot = (rows: (string|null)[][], truncated = false): DbSnapshot => ({ columns, rows, truncated, capturedAt: new Date().toISOString() });
describe('DB Pulse comparison semantics', () => {
  it('compares different engines by explicit key and reports typed cell evidence', () => {
    const left = snapshot([['1', 'same'], ['2', 'before'], ['3', null]]);
    const right = { ...snapshot([['1.0', 'same'], ['2', 'after'], ['4', 'new']]), columns: [{...columns[0],type:'int'},columns[1]] };
    const result = compareDbSnapshots(left, right, mapping);
    expect(result.summary).toEqual({leftRows:3,rightRows:3,matched:1,changed:1,leftOnly:1,rightOnly:1,differingCells:1});
    expect(result.verdict).toBe('different');
    expect(result.rows.find(row => row.status === 'changed')?.cells[1]).toMatchObject({left:'before',right:'after',equal:false});
  });
  it('does not label truncated windows equal even when their fetched rows match', () => {
    const result=compareDbSnapshots(snapshot([['1','x']],true),snapshot([['1','x']]),mapping);
    expect(result.verdict).toBe('inconclusive');expect(result.scope).toBe('bounded-read-window');
  });
  it('rejects duplicate/null keys rather than inventing row identity', () => {
    expect(()=>compareDbSnapshots(snapshot([['1','a'],['1','b']]),snapshot([]),mapping)).toThrow('Duplicate');
    expect(()=>compareDbSnapshots(snapshot([[null,'a']]),snapshot([]),mapping)).toThrow('NULL');
  });
  it('distinguishes NULL and empty text and permits composite keys', () => {
    expect(compareDbSnapshots(snapshot([['1',null]]),snapshot([['1','']]),mapping).summary.changed).toBe(1);
    expect(compareDbSnapshots(snapshot([['1','a'],['1','b']]),snapshot([['1','a'],['1','b']]),mapping.map(m=>({...m,key:true}))).verdict).toBe('equal');
  });
  it('preserves large decimal precision without Number conversion', () => {
    expect(decimalKey('900719925474099312345.00100')).toBe(decimalKey('900719925474099312345001e-3'));
    expect(decimalKey('900719925474099312345.001')).not.toBe(decimalKey('900719925474099312345.002'));
    expect(decimalKey('-0.000')).toBe('0');expect(()=>decimalKey('Infinity')).toThrow();
  });
  it('requires bounded mappings and supported scalar types',()=>{
    expect(()=>compareDbSnapshots(snapshot([]),snapshot([]),[])).toThrow();
    expect(()=>compareDbSnapshots(snapshot([]),snapshot([]),[...mapping,mapping[0]])).toThrow('only once');
    expect(()=>compareDbSnapshots({...snapshot([]),columns:[{...columns[0],type:'bytea'},columns[1]]},snapshot([]),mapping)).toThrow('not supported');
  });
});
describe('DB Pulse destination policy',()=>{
  const dns=lookup as jest.Mock;
  beforeEach(()=>{delete process.env.FORGEOS_DBPULSE_PRIVATE_HOSTS;delete process.env.DATABASE_URL;dns.mockReset();});
  afterEach(()=>{delete process.env.FORGEOS_DBPULSE_PRIVATE_HOSTS;delete process.env.DATABASE_URL;});
  it('blocks loopback, metadata, IPv6 and reserved ranges',()=>{
    for(const address of ['127.0.0.1','169.254.169.254','0.0.0.0','224.0.0.1','::1','::ffff:127.0.0.1','100.100.100.200'])expect(addressClass(address)).toBe('blocked');
    expect(addressClass('10.0.0.1')).toBe('private');expect(addressClass('8.8.8.8')).toBe('public');
  });
  it('does not allow private DNS or mixed DNS without exact operator approval',async()=>{
    dns.mockResolvedValue([{address:'10.2.3.4'},{address:'8.8.8.8'}]);
    await expect(resolveDbHost('customer.internal')).rejects.toThrow(ForbiddenException);
    process.env.FORGEOS_DBPULSE_PRIVATE_HOSTS='customer.internal';
    await expect(resolveDbHost('customer.internal')).resolves.toEqual({address:'10.2.3.4',private:true});
  });
  it('blocks platform aliases even if someone allowlists them',async()=>{
    process.env.DATABASE_URL='postgresql://user:password@platform-db:5432/app';
    process.env.FORGEOS_DBPULSE_PRIVATE_HOSTS='customer.internal';
    dns.mockResolvedValue([{address:'10.2.3.4'}]);
    await expect(resolveDbHost('customer.internal')).rejects.toThrow('application database');
    await expect(resolveDbHost('postgres')).rejects.toThrow('infrastructure');
  });
  it('rejects URLs and host strings containing credentials',async()=>{
    await expect(resolveDbHost('postgres://user:secret@db')).rejects.toThrow(BadRequestException);
    expect(dns).not.toHaveBeenCalled();
  });
});
describe('DB Pulse authorization and temporary references',()=>{
  it('keeps handles isolated by user/workspace and invalidates explicit disconnects',()=>{
    const service=new DbPulseService();
    const timer=setTimeout(()=>undefined,10000);timer.unref();
    (service as any).connections.set('reference',{scope:'user-a:workspace-a',input:{password:'do-not-return'},expires:Date.now()+10000,timer});
    expect(()=>(service as any).saved('reference','user-b:workspace-a')).toThrow(ForbiddenException);
    service.disconnect('reference','user-b:workspace-a');
    expect((service as any).saved('reference','user-a:workspace-a')).toEqual({password:'do-not-return'});
    service.disconnect('reference','user-a:workspace-a');
    expect(()=>(service as any).saved('reference','user-a:workspace-a')).toThrow();service.onModuleDestroy();
  });
  it('requires a member role and an enabled DB Pulse module before any connector call',async()=>{
    const platform={authorizeWorkspaceRole:jest.fn().mockResolvedValue({id:'workspace',moduleIds:[]})};
    const connector={connect:jest.fn()};
    const controller=new DbPulseController(platform as any,connector as any);
    const actor={kind:'user' as const,userId:'user',email:'user@example.test'};
    await expect(controller.connect({} as any,'00000000-0000-4000-8000-000000000000',{forgeosAuth:actor})).rejects.toThrow(ForbiddenException);
    expect(connector.connect).not.toHaveBeenCalled();
    expect(platform.authorizeWorkspaceRole).toHaveBeenCalledWith(expect.any(String),actor,['owner','admin','member']);
  });
});
