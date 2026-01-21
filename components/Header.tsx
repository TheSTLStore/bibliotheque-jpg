'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, BookOpen, User } from 'lucide-react';

interface HeaderProps {
  userName: string;
  userType: 'family' | 'association';
  associationName?: string;
}

export function Header({ userName, userType, associationName }: HeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  const displayName = userType === 'association' ? associationName : userName;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8 text-orange-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Bibliothèque JPG
              </h1>
              {userType === 'association' && (
                <p className="text-sm text-gray-500">{associationName}</p>
              )}
            </div>
          </div>

          {/* User info & Actions */}
          <div className="flex items-center space-x-4">
            {/* User name */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{displayName}</span>
            </div>

            {/* Dashboard link (family only) */}
            {userType === 'family' && (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  Mes réservations
                </Button>
              </Link>
            )}

            {/* Logout button (family only) */}
            {userType === 'family' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">
                  {loggingOut ? 'Déconnexion...' : 'Déconnexion'}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
