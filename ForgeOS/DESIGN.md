# ForgeOS design system

ForgeOS is a focused engineering console. Navigation stays predictable while each tool keeps room for its own editor, preview, and results. The interface uses a dark navigation rail and light working surface so data, statuses, and controls remain easy to scan.

## Foundations

- Color tokens live in `apps/web/app/styles.css`: canvas `#f5f6f8`, surface `#fff`, text `#172333`, muted `#607084`, action blue `#235bba`, success `#187b57`, warning `#a76712`, danger `#b34040`.
- Body text is 14px Arial/Helvetica with a 1.45 line height. Page titles are 32px on desktop and 27px on narrow screens. Small uppercase labels are reserved for navigation and section context.
- Major spacing steps are 8, 12, 20, 28, and 36px. Borders, not stacked shadows or nested cards, separate work areas. Radius is 5-10px according to element scale.
- Desktop has a 248px persistent rail; at 760px and below, navigation becomes a compact top section with horizontally scrollable tools. Content uses a 1440px maximum width.

## Interaction rules

- Primary actions use solid blue; secondary actions are quiet text or outlined controls. Status color always accompanies a text label.
- Every control needs a visible keyboard focus state, a programmatic label, and a disabled state during writes. Escape closes dialogs and the command palette; Ctrl/Cmd+K opens search.
- Data surfaces must show loading, empty, error, and long-content states. Do not substitute demo metrics for API data.
- Tool pages share workspace context and navigation but should use task-specific layouts for editing, previewing, results, history, and export. Avoid returning every tool to a single generic card.

## Current boundary

This file describes the shared console delivered so far. It does not assert legacy-module feature parity. Keep `docs/MODULE-MIGRATION.md` as the source of truth for unfinished module workflows.
