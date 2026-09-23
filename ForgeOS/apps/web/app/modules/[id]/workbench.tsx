'use client';
import type { ModuleId } from '@forgeos/contracts';
import { CommitTool, CompareTool, RegexTool, ResumeTool, VaultTool, MathShieldTool, ImageDiffTool } from './workbench-tools';
import { ScaffoldTool, EvaluationTool, LoadScriptTool, PulseWatchTool, AuditExplorerTool } from './more-tools';
import { PromptTool } from './prompt-vault';
import { ModelViewerTool } from './model-viewer';

export function Workbench({ id }: { id: ModuleId }) {
  switch (id) {
    case 'commitcraft': return <CommitTool />;
    case 'stackforge': return <ScaffoldTool />;
    case 'snapdiff': return <ImageDiffTool />;
    case 'comparer': return <CompareTool />;
    case 'regexforge': return <RegexTool />;
    case 'loadlab': return <LoadScriptTool />;
    case 'promptvault': return <PromptTool />;
    case 'probeai': return <EvaluationTool />;
    case 'pulsewatch': return <PulseWatchTool />;
    case 'dbpulse': return <AuditExplorerTool />;
    case 'glbviewer': return <ModelViewerTool />;
    case 'craftcv': return <ResumeTool />;
    case 'vaultiq': return <VaultTool />;
    case 'mathshield': return <MathShieldTool />;
  }
}
