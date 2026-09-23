import { notFound } from 'next/navigation';
import { modules, type ModuleId } from '@forgeos/contracts';
import { ModuleGate } from './module-gate';

export function generateStaticParams() { return modules.map(module => ({ id: module.id })); }

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const module = modules.find(item => item.id === id);
  if (!module) notFound();
  return <main className="module-page"><div className="module-header"><a href="/">← ForgeOS overview</a><p>{module.category.toUpperCase()} / WORKBENCH</p><h1>{module.name}</h1><span>{module.description}</span></div><ModuleGate id={id as ModuleId} /></main>;
}
