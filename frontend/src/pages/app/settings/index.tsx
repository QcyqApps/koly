import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { User, DollarSign, Briefcase, LogOut, ChevronRight, Settings } from 'lucide-react';

const settingsItems = [
  {
    path: '/app/settings/profile',
    icon: User,
    label: 'Profil',
    description: 'Dane osobowe i biznesowe',
  },
  {
    path: '/app/settings/costs',
    icon: DollarSign,
    label: 'Koszty stałe',
    description: 'Czynsz, media, księgowość',
  },
  {
    path: '/app/settings/services',
    icon: Briefcase,
    label: 'Usługi',
    description: 'Cennik i czas trwania',
  },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <div className="space-y-4 lg:space-y-6 max-w-2xl">
      <PageHeader
        icon={Settings}
        title="Ustawienia"
        description="Zarządzaj profilem i konfiguracją"
      />

      {/* User info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{user?.name || 'Użytkownik'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings items */}
      <Card>
        <CardContent className="p-0">
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted transition-colors ${
                  index < settingsItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Logout button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => logout()}
        disabled={isLoggingOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj się'}
      </Button>

      {/* App info */}
      <p className="text-center text-xs text-muted-foreground">AiCostTracker v1.0.0</p>
    </div>
  );
}
