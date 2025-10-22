'use client';

import { useState } from 'react';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Menu, X } from 'lucide-react';

import { ThemeSelect } from '@/components/theme-select';
import { Button } from '@/components/ui/button';
import { WalletDropdown } from '@/components/wallet-dropdown';

const ClusterDropdown = dynamic(() => import('@/components/cluster-dropdown').then((m) => m.ClusterDropdown), {
  ssr: false,
});

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path);
  }

  return (
    <header className="relative z-50 bg-card/50 px-4 py-2">
      <div className="mx-auto flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <Link className="text-xl hover:text-neutral-500 dark:hover:text-white" href="/">
            <span>Cascade</span>
          </Link>
          <div className="hidden items-center md:flex">
            <ul className="flex flex-nowrap items-center gap-4">
              {links.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    className={`hover:text-neutral-500 dark:hover:text-white ${isActive(path) ? 'text-neutral-500 dark:text-white' : ''}`}
                    href={path}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        <div className="hidden items-center gap-4 md:flex">
          <WalletDropdown />
          <ClusterDropdown />
          <ThemeSelect />
        </div>

        {showMenu && (
          <div className="fixed inset-x-0 top-[52px] bottom-0 bg-neutral-100/95 backdrop-blur-sm md:hidden dark:bg-neutral-900/95">
            <div className="flex flex-col gap-4 border-t p-4 dark:border-neutral-800">
              <div className="flex items-center justify-end gap-4">
                <WalletDropdown />
                <ClusterDropdown />
                <ThemeSelect />
              </div>
              <ul className="flex flex-col gap-4">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`block py-2 text-lg ${isActive(path) ? 'text-foreground' : 'text-muted-foreground'} hover:text-foreground`}
                      href={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
