import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PageHeader({ icon: Icon, title, description }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-[18px] w-[18px] text-primary" />
      </div>
      <div className="flex flex-col">
        <h1 className="text-base font-semibold text-foreground leading-tight">{title}</h1>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
