# ForgeOS user guide

The signed-in navigation now includes Help & tutorial, Profile, Current session and Activity log.

- /tutorial: five practical onboarding steps, with a manual checklist stored in this browser per workspace.
- /help: searchable instructions for every registered tool, including examples, outputs, data storage and current limits. Each tool has a How to use this tool link.
- /help/desk: persistent internal workspace tickets. Members see their own tickets; owners/admins see the workspace queue and change status. Auditors cannot create tickets. No email or external vendor notification is sent.
- /help/competitors: 17 official-source comparisons and UI entry links, covering two broader developer portals and alternatives for the 15 individual tools. Access requirements and adjacent rather than direct matches are labeled.
- /settings/profile: read-only signed-in email, user ID and selected workspace role.
- /settings/sessions: current verified authentication method and expiry, plus this-browser sign-out. No historical login/device registry is claimed.
- /activity: latest 20 recorded workspace events, with filtering and stored hashes. This is not a complete audit export or every-click/session log.

Help-desk data is stored in PostgreSQL support_tickets by additive migration 7. Ticket routes require authenticated workspace membership. Ticket writes use existing audit events. Ticket lists show up to 100 recent accessible records. The help desk has no external support SLA, email delivery, attachments or conversation thread.

Tool instructions live in apps/web/app/help-content.ts; competitor sources and access labels live in apps/web/app/competitors.json. Keep those aligned with actual module workflows and reviewed official sources. Avoid describing future runtime features as deployed protection.
