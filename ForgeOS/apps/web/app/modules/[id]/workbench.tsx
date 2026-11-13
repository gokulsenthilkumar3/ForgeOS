'use client';
import type { ModuleId } from '@forgeos/contracts';
import { ResumeTool, VaultTool, MathShieldTool } from './workbench-tools';
import { CommitTool } from './commit-tool';
import { CompareTool } from './compare-tool';
import { RegexTool } from './regex-tool';
import { LoadScriptTool } from './more-tools';
import { EvaluationTool } from './probe-tool';
import { PulseWatchTool } from './pulsewatch-tool';
import { DbPulseTool } from './dbpulse-compare';
import { ScaffoldTool } from './scaffold-tool';
import { PromptTool } from './prompt-vault';
import { ModelViewerTool } from './model-viewer';
import { ImageDiffTool } from './snapdiff-tool';
import { AgentShieldTool } from './agent-shield';

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
    case 'dbpulse': return <DbPulseTool />;
    case 'glbviewer': return <ModelViewerTool />;
    case 'craftcv': return <ResumeTool />;
    case 'vaultiq': return <VaultTool />;
    case 'mathshield': return <MathShieldTool />;
    case 'agentshield': return <AgentShieldTool />;
  }
}
