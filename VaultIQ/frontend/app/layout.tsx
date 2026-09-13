import type { Metadata } from 'next';
import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { VaultProvider } from '../context/VaultContext';
import Shell from '../components/Shell';

export const metadata: Metadata = {
  title: 'VaultIQ — Premium Password Manager',
  description: 'Zero-knowledge, military-grade password manager with breach detection, security analytics, and seamless team sharing.',
  keywords: 'password manager, zero knowledge, AES-256, breach detection, vault security',
  openGraph: {
    title: 'VaultIQ — Premium Password Manager',
    description: 'Your credentials, encrypted. Your security, guaranteed.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          <VaultProvider>
            <Shell>{children}</Shell>
          </VaultProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
