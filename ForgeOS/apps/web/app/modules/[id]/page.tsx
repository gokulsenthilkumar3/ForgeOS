import { notFound } from 'next/navigation';
import { modules, type ModuleId } from '@forgeos/contracts';
import { ConsoleShell } from '../../shell';

export function generateStaticParams() { return modules.map(module => ({ id: module.id })); }

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!modules.some(module => module.id === id)) notFound();
  return <ConsoleShell moduleId={id as ModuleId} />;
}
