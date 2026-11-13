import { notFound } from 'next/navigation';
import { modules } from '@forgeos/contracts';
import { ConsoleShell } from '../../shell';
export const dynamicParams=false;
export function generateStaticParams(){return modules.map(module=>({id:module.id}));}
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const module=modules.find(item=>item.id===id);if(!module)notFound();
 return <ConsoleShell section="dashboards" dashboardId={module.id}/>;
}
