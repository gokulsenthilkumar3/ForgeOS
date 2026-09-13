# Module migration map

ForgeOS retains the source folders as read-only references while porting capabilities into the module contract and worker registry.

| ForgeOS module | Reference source | First integration boundary |
| --- | --- | --- |
| CommitCraft / StackForge / SnapDiff | `CommitCraft`, `StackForge`, `SnapDiff` | GitHub + artifact/run adapters |
| Comparer / RegexForge / Load Lab | `Comparer`, `RegexForge`, `K6` | Browser comparison + private worker runner |
| PromptVault / ProbeAI | `PromptVault`, `ProbeAI - LLM Tester` | LLM provider and Python evaluator adapters |
| PulseWatch / DBPulse | `PulseWatch`, `DBPulse` | Monitor/database agent adapters |
| GLBViewer / CraftCV / VaultIQ | `GLBViewer`, `CraftCV`, `VaultIQ` | Encrypted artifact and client-side crypto boundaries |

All module adapters must emit shared `Run`, `Artifact`, `AuditEvent`, and `Notification` records. No adapter receives a raw workspace secret outside its authorized execution window.
