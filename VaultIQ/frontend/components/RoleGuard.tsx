'use client';

import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
  roles: Array<'ADMIN' | 'MANAGER' | 'USER'>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role as 'ADMIN' | 'MANAGER' | 'USER')) return <>{fallback}</>;
  return <>{children}</>;
}
