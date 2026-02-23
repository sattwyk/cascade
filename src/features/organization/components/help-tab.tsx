'use client';

import { useState } from 'react';

import { ExternalLink, Search } from 'lucide-react';

import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';
import { Input } from '@/core/ui/input';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: number;
  url: string;
}

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: '1',
    title: 'Getting Started with Cascade',
    description: 'Learn the basics of setting up your employer account and creating your first payment stream',
    category: 'Getting Started',
    readTime: 5,
    url: 'https://docs.cascade.com/getting-started',
  },
  {
    id: '2',
    title: 'Creating Payment Streams',
    description: 'Step-by-step guide to creating and managing payment streams for your employees',
    category: 'Streams',
    readTime: 8,
    url: 'https://docs.cascade.com/streams',
  },
  {
    id: '3',
    title: 'Managing Employee Wallets',
    description: 'How to set up and manage Solana wallets for your employees',
    category: 'Employees',
    readTime: 6,
    url: 'https://docs.cascade.com/wallets',
  },
  {
    id: '4',
    title: 'Understanding Vault Balance',
    description: 'Learn how vault balances work and how to manage your funding',
    category: 'Funding',
    readTime: 4,
    url: 'https://docs.cascade.com/vault',
  },
  {
    id: '5',
    title: 'Emergency Withdrawals',
    description: 'When and how to perform emergency withdrawals from payment streams',
    category: 'Streams',
    readTime: 5,
    url: 'https://docs.cascade.com/emergency-withdraw',
  },
  {
    id: '6',
    title: 'Compliance and Reporting',
    description: 'Generate reports and ensure compliance with payroll regulations',
    category: 'Reports',
    readTime: 7,
    url: 'https://docs.cascade.com/compliance',
  },
];

export function HelpTab() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = HELP_ARTICLES.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const categories = Array.from(new Set(HELP_ARTICLES.map((a) => a.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Help & Documentation</h1>
        <p className="text-muted-foreground">Find answers and learn how to use Cascade</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={searchQuery.toLowerCase() === category.toLowerCase() ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchQuery(category)}
              title={`Filter by ${category}`}
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {/* Articles */}
      <div className="space-y-4">
        {filteredArticles.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="py-8 text-center text-muted-foreground">No articles found matching your search</p>
            </CardContent>
          </Card>
        ) : (
          filteredArticles.map((article) => (
            <Card key={article.id} className="transition-colors hover:border-primary/50">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{article.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {article.category}
                      </Badge>
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground">{article.description}</p>
                    <p className="text-xs text-muted-foreground">{article.readTime} min read</p>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Common resources and external links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-between bg-transparent" asChild>
            <a href="https://docs.cascade.com" target="_blank" rel="noopener noreferrer">
              <span>Full Documentation</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-between bg-transparent" asChild>
            <a href="https://status.cascade.com" target="_blank" rel="noopener noreferrer">
              <span>System Status</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-between bg-transparent" asChild>
            <a href="https://community.cascade.com" target="_blank" rel="noopener noreferrer">
              <span>Community Forum</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
