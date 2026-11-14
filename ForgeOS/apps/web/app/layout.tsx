import './styles.css';
import './workbench.css';
import './module-settings.css';
import './mobile.css';
import './help.css';
import './engineering-workbench.css';
import './experience.css';
import './reference-polish.css';
import './navigation.css';
import './security.css';
import './utility-workspaces.css';
import './database-compare.css';
import './ai-workspaces.css';
import './tool-dashboards.css';
export const metadata = { title: 'ForgeOS', description: 'Unified engineering operations' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
