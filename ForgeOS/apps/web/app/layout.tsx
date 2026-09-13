import './styles.css';
export const metadata = { title: 'ForgeOS', description: 'Unified engineering operations' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
