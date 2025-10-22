import React from 'react';

import {
  ArrowRight,
  BookOpen,
  CookingPot,
  Droplets,
  LucideAnchor,
  LucideCode,
  LucideWallet,
  MessageCircleQuestion,
} from 'lucide-react';

import { AppHero } from '@/components/app-hero';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const primary: {
  label: string;
  href: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    label: 'Solana Docs',
    href: 'https://solana.com/docs',
    description: 'The official documentation. Your first stop for understanding the Solana ecosystem.',
    icon: <BookOpen className="h-8 w-8 text-purple-400" />,
  },
  {
    label: 'Solana Cookbook',
    href: 'https://solana.com/developers/cookbook/',
    description: 'Practical examples and code snippets for common tasks when building on Solana.',
    icon: <CookingPot className="h-8 w-8 text-green-400" />,
  },
];

const secondary: {
  label: string;
  href: string;
  icon: React.ReactNode;
}[] = [
  {
    label: 'Solana Faucet',
    href: 'https://faucet.solana.com/',
    icon: <Droplets className="h-5 w-5 text-green-400" />,
  },
  {
    label: 'Solana Stack Overflow',
    href: 'https://solana.stackexchange.com/',
    icon: <MessageCircleQuestion className="h-5 w-5 text-orange-400" />,
  },
  {
    label: 'Wallet UI Docs',
    href: 'https://wallet-ui.dev',
    icon: <LucideWallet className="h-5 w-5 text-blue-400" />,
  },
  {
    label: 'Anchor Docs',
    href: 'https://www.anchor-lang.com/docs',
    icon: <LucideAnchor className="h-5 w-5 text-indigo-400" />,
  },
  {
    label: 'Codama Repository',
    href: 'https://github.com/codama-idl/codama',
    icon: <LucideCode className="h-5 w-5 text-lime-400" />,
  },
];

export default function DashboardFeature() {
  return (
    <div>
      <AppHero title="gm" subtitle="Say hi to your new Solana app." />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {primary.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="group block">
              <Card className="flex h-full flex-col transition-all duration-200 ease-in-out group-hover:-translate-y-1 group-hover:border-primary group-hover:shadow-lg">
                <CardHeader className="flex-row items-center gap-4">
                  {link.icon}
                  <div>
                    <CardTitle className="transition-colors group-hover:text-primary">{link.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground">{link.description}</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>More Resources</CardTitle>
              <CardDescription>Expand your knowledge with these community and support links.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {secondary.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="group -m-2 flex items-center gap-4 rounded-md p-2 transition-colors hover:bg-muted"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.icon}
                      <span className="flex-grow text-muted-foreground transition-colors group-hover:text-foreground">
                        {link.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
