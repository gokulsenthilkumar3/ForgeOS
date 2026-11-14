// Runs in the API container against separate disposable integration databases.
const assert=require('node:assert/strict');
const {DbPulseService}=require(process.cwd()+'/apps/api/dist/dbpulse.service.js');
(async()=>{
 const password=process.env.DBPULSE_FIXTURE_PASSWORD;assert.ok(password);
 const service=new DbPulseService(),scope='fixture-user:fixture-workspace';
 const source={engine:'postgres',host:'dbpulse-fixture-pg',port:5432,database:'dbpulse_source',username:'dbpulse_reader',password,tls:false};
 const target={engine:'mysql',host:'dbpulse-fixture-mysql',port:3306,database:'dbpulse_target',username:'dbpulse_reader',password,tls:false};
 try{
  const left=await service.connect(scope,source),right=await service.connect(scope,target);
  assert.ok(left.tables.some(t=>t.name==='items'));assert.ok(right.tables.some(t=>t.name==='items'));
  assert.ok(!JSON.stringify(left).includes(password));assert.ok(!JSON.stringify(right).includes(password));
  const a={connectionId:left.connectionId,schema:'public',table:'items'},b={connectionId:right.connectionId,schema:'dbpulse_target',table:'items'};
  assert.equal((await service.discover(scope,a)).columns.find(c=>c.name==='id').primary,true);
  const mappings=[{left:'id',right:'id',mode:'numeric',key:true},{left:'name',right:'name',mode:'text',key:false},{left:'amount',right:'amount',mode:'numeric',key:false},{left:'nullable_text',right:'nullable_text',mode:'text',key:false}];
  const result=await service.compare(scope,a,b,mappings,100);
  assert.equal(result.verdict,'different');assert.equal(result.summary.matched,1);assert.equal(result.summary.changed,2);assert.equal(result.summary.leftOnly,1);assert.equal(result.summary.rightOnly,1);
  const precise=result.rows.find(row=>row.key[0]==='5');assert.equal(precise.cells.find(c=>c.leftColumn==='amount').equal,true);assert.equal(precise.cells.find(c=>c.leftColumn==='nullable_text').equal,false);
  assert.equal((await service.compare(scope,a,b,mappings,2)).verdict,'inconclusive');assert.equal((await service.compare(scope,a,a,mappings,100)).verdict,'equal');
  await assert.rejects(service.discover('another-user:fixture-workspace',a));
  await assert.rejects(service.connect(scope,{...source,password:'incorrect-fixture-password'}),error=>error.message.includes('authentication')&&!error.message.includes(password));
  await service.withDb(source,async driver=>{assert.equal((await driver.query('SHOW transaction_read_only'))[0].transaction_read_only,'on');assert.equal((await driver.query("SELECT has_table_privilege(current_user,'public.items','INSERT') AS allowed"))[0].allowed,'f');});
  await service.withDb(target,async driver=>{const grants=await driver.query('SHOW GRANTS FOR CURRENT_USER()');assert.ok(grants.some(row=>Object.values(row).some(value=>String(value).includes('GRANT SELECT'))));assert.ok(!grants.some(row=>Object.values(row).some(value=>/GRANT .*INSERT/.test(String(value)))));});
  service.disconnect(left.connectionId,scope);await assert.rejects(service.discover(scope,a));
  console.log('PASS: real PostgreSQL-to-MySQL discovery, read-only access, keyed rows/cells, large decimals, NULL/empty, bounded reads, invalid credentials, handle isolation and disconnect.');
 }finally{service.onModuleDestroy();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
