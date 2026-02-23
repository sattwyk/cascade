'use client';

import { AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';

import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'maintenance';
  uptime: number;
  lastIncident?: string;
}

const SERVICES: ServiceStatus[] = [
  {
    name: 'API',
    status: 'operational',
    uptime: 99.99,
    lastIncident: '2024-10-15',
  },
  {
    name: 'Solana Network',
    status: 'operational',
    uptime: 99.95,
    lastIncident: '2024-10-10',
  },
  {
    name: 'Dashboard',
    status: 'operational',
    uptime: 99.98,
    lastIncident: '2024-10-12',
  },
  {
    name: 'Payment Processing',
    status: 'operational',
    uptime: 99.99,
    lastIncident: '2024-10-08',
  },
];

export function StatusTab() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'maintenance':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-500/10 text-green-700">Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/10 text-yellow-700">Degraded</Badge>;
      case 'maintenance':
        return <Badge className="bg-blue-500/10 text-blue-700">Maintenance</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Status</h1>
          <p className="text-muted-foreground">Real-time status of Cascade services</p>
        </div>
        <Button variant="outline" className="gap-2 bg-transparent" asChild>
          <a href="https://status.cascade.com" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Full Status Page
          </a>
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">All Systems Operational</p>
              <p className="text-sm text-green-700">All services are running normally</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Service Status</h2>
        {SERVICES.map((service) => (
          <Card key={service.name}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">Uptime: {service.uptime}%</p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(service.status)}
                  {service.lastIncident && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last incident: {new Date(service.lastIncident).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Incident History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>No incidents in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">All systems have been running smoothly</p>
        </CardContent>
      </Card>
    </div>
  );
}
