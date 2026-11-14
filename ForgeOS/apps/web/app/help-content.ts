import type { ModuleId } from '@forgeos/contracts';
export type ToolGuide = { id: ModuleId; purpose: string; steps: string[]; example: string; output: string; storage: string; limitations: string };
export const toolGuides: ToolGuide[] = [
  {
    "id": "commitcraft",
    "purpose": "Draft and save Conventional Commit messages; download the offline editor review extension.",
    "steps": [
      "Choose a type, optional scope and summary in the web app",
      "Save a workspace message draft or use an explicitly selected provider",
      "Download the VSIX for local staged-change review in a compatible editor",
      "Review the draft and explicitly copy it or apply it to the SCM input"
    ],
    "example": "fix(auth): support password sign-in",
    "output": "Copied commit text; no Git commit is executed.",
    "storage": "Web message drafts use workspace PostgreSQL records; pasted diffs and provider keys are not saved with those drafts. The extension makes no network/model call and does not persist raw diffs.",
    "limitations": "The VSIX is a local development release. VS Code development-host checks passed; other requested editors need individual validation. It does not stage, commit, push or provide GitLens feature parity."
  },
  {
    "id": "stackforge",
    "purpose": "Generate a deterministic starter, inspect its full source tree and download a ZIP.",
    "steps": [
      "Enter a project name",
      "Choose Next.js, API or TypeScript library",
      "Review the generated files",
      "Download the ZIP and run its README commands"
    ],
    "example": "my-customer-portal",
    "output": "A downloadable project ZIP.",
    "storage": "Generation happens in your browser; the ZIP is saved where your browser downloads files.",
    "limitations": "Recipe validation is separate from build/test execution. There is no app-building agent or isolated validation worker yet; generated code has not been built by ForgeOS."
  },
  {
    "id": "snapdiff",
    "purpose": "Compare two screenshots and highlight changed pixels.",
    "steps": [
      "Choose supported baseline and candidate screenshots up to 25 MiB and 4 MP each",
      "Set the channel threshold and compare in the local worker",
      "Inspect side-by-side, overlay, wipe or difference views",
      "Download the diff PNG and JSON evidence report"
    ],
    "example": "Compare two screenshots of the same page at the same viewport size.",
    "output": "Changed-pixel counts/percentage, change bounds, client elapsed time, PNG and JSON exports.",
    "storage": "Images stay in the browser. A local worker compares alpha-composited pixels on a white background.",
    "limitations": "Dimensions must match; no silent resizing. Header preflight rejects unsupported/animated inputs. Pixel differences are not semantic correctness. Browser capture, masks, saved baselines and approvals remain planned."
  },
  {
    "id": "comparer",
    "purpose": "See how two versions of text, SQL or JSON differ.",
    "steps": [
      "Paste the original content",
      "Paste the updated content",
      "Choose the format and available comparison options",
      "Inspect additions and removals"
    ],
    "example": "Original: {\"count\":1} / Updated: {\"count\":2}",
    "output": "A readable comparison; source files are not changed.",
    "storage": "Inputs stay in the current browser page.",
    "limitations": "Spreadsheet, document and folder comparison engines are not integrated."
  },
  {
    "id": "regexforge",
    "purpose": "Test a JavaScript regular expression against sample text.",
    "steps": [
      "Enter a pattern without surrounding slashes",
      "Choose flags such as g or i",
      "Paste sample text",
      "Run the test and inspect matches and groups"
    ],
    "example": "Pattern: [A-Z]{2}[0-9]{3} / Sample: AB123 CD456",
    "output": "Matches, positions and capture groups.",
    "storage": "Patterns and samples are processed in the browser.",
    "limitations": "Saved collections, sharing and Python/Go runners are not integrated; engine behavior can differ from other languages."
  },
  {
    "id": "loadlab",
    "purpose": "Prepare a K6 script for a load test you will run separately.",
    "steps": [
      "Enter an endpoint you are authorized to test",
      "Set the available test parameters",
      "Generate the script",
      "Download it and review before running K6"
    ],
    "example": "https://your-service.example/health",
    "output": "A K6 JavaScript file.",
    "storage": "The script is generated locally and downloaded.",
    "limitations": "ForgeOS does not currently dispatch the script to a worker or display live load-test results."
  },
  {
    "id": "promptvault",
    "purpose": "Keep named prompt versions and run a prompt with a selected model.",
    "steps": [
      "Search the library or create a prompt in the editor",
      "Save a version and inspect its history",
      "Edit and save another version",
      "Review variable values and request preview, then explicitly run with your provider key"
    ],
    "example": "Summarize {{topic}} in three bullet points.",
    "output": "Workspace-persisted prompt versions and an optional model response.",
    "storage": "Saved versions use workspace records in PostgreSQL. Old browser prompts can be imported with a backup. Model calls send text to your selected provider.",
    "limitations": "Team collections, branching and complete standalone parity remain unfinished."
  },
  {
    "id": "probeai",
    "purpose": "Compare model responses and check small exact-match evaluation cases.",
    "steps": [
      "Prepare a prompt and expected answer",
      "Choose the available model controls",
      "Run the model or evaluation",
      "Inspect actual output against expected text"
    ],
    "example": "Expected answer: Paris / Question: What is the capital of France?",
    "output": "Model responses and simple evaluation results.",
    "storage": "Model requests use the selected external provider. Current evaluation inputs/results are page-local; only numeric last-run summary metadata is retained in this browser tab for /dashboards/probeai.",
    "limitations": "The scorer is case-sensitive trimmed exact match, not semantic correctness. Pasted evaluation supports up to 100 cases; model batches up to 10, with stop-after-current-case control. Persistent regression history and broader scorers are not integrated."
  },
  {
    "id": "pulsewatch",
    "purpose": "Monitor HTTP endpoints and inspect uptime incidents.",
    "steps": [
      "Add a name and an authorized public endpoint URL",
      "Save the monitor",
      "Use Check now or wait for service checks",
      "Filter monitors, select an endpoint, and inspect recorded checks, incidents and notifications"
    ],
    "example": "My API / https://your-service.example/health",
    "output": "Monitor status, latency and incident records.",
    "storage": "The private PulseWatch service persists its monitoring state.",
    "limitations": "Only HTTP checks are integrated. Unchecked monitors are not failures; unavailable measurements are shown explicitly. Browser journeys, console capture, DB probes, public status pages and external notification-channel setup are not integrated."
  },
  {
    "id": "dbpulse",
    "purpose": "Compare selected tables from two external databases, including PostgreSQL to MySQL/MariaDB.",
    "steps": [
      "Enter source and target database connections with read-only accounts",
      "Test both connections and choose discovered base tables",
      "Map columns and select a unique non-null key or composite key",
      "Choose a bounded read limit and compare row and cell evidence"
    ],
    "example": "Compare a PostgreSQL table to a MySQL table by a shared key using explicit numeric normalization.",
    "output": "Live connection tests, discovered tables/columns, schema mappings, keyed row/cell differences and downloadable JSON results.",
    "storage": "Connection credentials are kept only in connector memory for up to 10 minutes, bound to the signed-in user and workspace. Results stay in the page unless explicitly downloaded; only numeric summary metadata is retained in this browser tab for /dashboards/dbpulse. Neither credentials nor result rows are written to ForgeOS records.",
    "limitations": "PostgreSQL and MySQL/MariaDB adapters only. At most 200 rows per side and 12 mapped scalar columns; truncated reads are inconclusive. Binary/spatial/custom types, IPv6, full-database automatic traversal and MongoDB/Redis/SQLite adapters are not implemented. Public endpoints require verified TLS; private hosts require an operator allowlist. ForgeOS application databases and infrastructure are blocked."
  },
  {
    "id": "glbviewer",
    "purpose": "Open and inspect a local GLB 3D model.",
    "steps": [
      "Choose a GLB model",
      "Inspect playback and rotation controls",
      "Adjust the available view controls",
      "Capture a PNG when needed"
    ],
    "example": "Open a local product-model.glb file.",
    "output": "An interactive model view and optional PNG capture.",
    "storage": "The model is opened from your device.",
    "limitations": "Persistent uploads, public share links, embeds and advanced lighting/morph controls are not integrated."
  },
  {
    "id": "craftcv",
    "purpose": "Write a resume with a live preview, local drafts and browser print/PDF.",
    "steps": [
      "Enter your name, title and contact email",
      "Write a summary, experience, education, skills and optional projects",
      "Review the CV preview",
      "Choose Print / save as PDF"
    ],
    "example": "Title: Software engineer / Experience: Built an internal developer portal.",
    "output": "A printable CV.",
    "storage": "Edits stay in the open page until explicitly saved. Local drafts are unencrypted and scoped to the workspace on this browser; export JSON for a portable copy.",
    "limitations": "Version 1 CraftCV JSON import/export is supported; arbitrary Word/PDF import, cloud sync and autosave are not. Review browser print pagination before saving PDF."
  },
  {
    "id": "vaultiq",
    "purpose": "Keep an encrypted local credential vault.",
    "steps": [
      "Choose a strong vault password",
      "Unlock or create the workspace vault",
      "Search, add or edit credentials; explicitly reveal or copy a secret",
      "Save encrypted changes, download an encrypted backup and lock when finished"
    ],
    "example": "Store a sample non-production credential first.",
    "output": "Encrypted entries stored by this browser for the workspace.",
    "storage": "Vault data is browser-local ciphertext; the vault password is separate from your ForgeOS account password.",
    "limitations": "Locks when the tab is hidden or after 5 minutes without keyboard/pointer interaction. Encrypted backup download is available; restore UI, cloud sync, sharing and password recovery are not. Clipboard history may retain copied passwords."
  },
  {
    "id": "mathshield",
    "purpose": "Generate and solve human-verification challenges.",
    "steps": [
      "Choose a challenge type and difficulty, then generate a challenge",
      "Read the question",
      "Enter your answer",
      "Verify and inspect correctness, service risk and reasoning"
    ],
    "example": "Solve the generated arithmetic question.",
    "output": "A challenge verification result from the MathShield service.",
    "storage": "Challenge generation and verification call the private MathShield backend through ForgeOS.",
    "limitations": "Results are service heuristics, not an identity guarantee. This playground does not save answers or tokens. Analytics/configuration UI remains unfinished. AgentShield is at /modules/agentshield; the separate CDN planning page is /cdn."
  },
  {
    "id": "agentshield",
    "purpose": "Draft explicit agent authorization/containment rules and simulate decisions, separately from human verification and CDN.",
    "steps": [
      "Choose sandbox or community",
      "Enter exact allowed actions and origins",
      "Set token budget and public-asset cache TTL",
      "Save a draft and preview a request decision"
    ],
    "example": "Sandbox / action projects:read / no internet origins / budget 2000",
    "output": "A saved administrator policy draft and a local allow/deny preview.",
    "storage": "Policy drafts are workspace-scoped PostgreSQL records. The simulator makes no network call.",
    "limitations": "No deployed isolation or A2A/MCP executor. Managed CDN is a separate proposed product. The retained cache field is legacy draft metadata and grants no runtime behavior."
  }
];
