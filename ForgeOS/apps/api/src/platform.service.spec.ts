import { PlatformService } from './platform.service';
describe('PlatformService', () => { it('creates and completes a module run with an audit record', () => { const service = new PlatformService(); const run = service.startRun('prj_demo', 'snapdiff'); expect(service.completeRun(run.id, true).status).toBe('passed'); expect(service.overview().audit).toHaveLength(2); }); });
