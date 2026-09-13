import type { ModuleId, Run } from '@forgeos/contracts';
export interface Job { run: Run; secretReferenceIds: string[]; payload: Record<string, unknown> }
export interface ModuleRunner { moduleId: ModuleId; execute(job: Job): Promise<{ passed: boolean; artifacts: string[] }> }
export class WorkerRegistry { private runners = new Map<ModuleId, ModuleRunner>(); register(runner: ModuleRunner) { this.runners.set(runner.moduleId, runner); } async execute(job: Job) { const runner = this.runners.get(job.run.moduleId); if (!runner) throw new Error(`No runner registered for ${job.run.moduleId}`); return runner.execute(job); } }
// Network-adjacent tasks (database capture and private K6 runs) execute here, not in the browser.
console.log('ForgeOS worker ready');
