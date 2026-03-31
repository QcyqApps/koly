import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { servicesApi } from '@/api/services';
import { visitsApi } from '@/api/visits';
import { dayApi } from '@/api/day';
import { categoriesApi } from '@/api/categories';
import { galleryApi } from '@/api/gallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Clock,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Scissors,
  ClipboardList,
  UserX,
  Trash2,
  CalendarDays,
  List,
  Lock,
  Pencil,
  MessageSquare,
  Star,
  X,
  Plus,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPLNCompact } from '@/lib/format';
import { toast } from 'sonner';
import type { DailySnapshot, Visit } from '@/types/visit';
import type { Service, ServiceCategory } from '@/types/service';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('pl-PL', {
    month: 'long',
    year: 'numeric',
  });
}

const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

type ViewMode = 'day' | 'calendar';

// Service grid component to avoid code duplication
function ServiceGrid({
  services,
  visits,
  isClosed,
  isPending,
  onServiceClick,
  onToggleFavorite,
}: {
  services: Service[];
  visits: Visit[];
  isClosed: boolean;
  isPending: boolean;
  onServiceClick: (serviceId: string) => void;
  onToggleFavorite: (e: React.MouseEvent, serviceId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
      {services.map((service) => {
        const visitCount = visits.filter(
          (v) => v.serviceId === service.id && v.status === 'completed'
        ).length;
        return (
          <div
            key={service.id}
            className={cn(
              'relative rounded-lg border bg-background',
              visitCount > 0 && 'border-primary bg-primary/5',
              service.isFavorite && 'ring-2 ring-yellow-400/50',
              isClosed && 'opacity-50'
            )}
          >
            {/* Favorite star button */}
            <button
              type="button"
              onClick={(e) => onToggleFavorite(e, service.id)}
              className="absolute top-1 left-1 p-1 hover:bg-muted rounded-md transition-colors z-10"
              title={service.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            >
              <Star
                className={cn(
                  'h-4 w-4 transition-colors',
                  service.isFavorite
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground hover:text-yellow-400'
                )}
              />
            </button>

            {/* Visit count badge */}
            {visitCount > 0 && (
              <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium z-10">
                {visitCount}
              </div>
            )}

            {/* Main button */}
            <button
              type="button"
              onClick={() => onServiceClick(service.id)}
              disabled={isPending || isClosed}
              className="w-full h-auto py-3 px-3 flex flex-col items-start gap-1 text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-medium w-full truncate pl-5">{service.name}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-5">
                <span>{formatPLNCompact(service.price)}</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {service.durationMinutes} min
                </span>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface CalendarDayData {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  snapshot?: DailySnapshot;
  visitCount: number;
  noShowCount: number;
  revenue: number;
  isClosed: boolean;
}

export function VisitsPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dateStr = formatDate(selectedDate);

  // Get month boundaries for calendar data
  const monthStart = useMemo(() => {
    const d = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    return formatDate(d);
  }, [calendarMonth]);

  const monthEnd = useMemo(() => {
    const d = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    return formatDate(d);
  }, [calendarMonth]);

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', 'active'],
    queryFn: servicesApi.getActive,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits', dateStr],
    queryFn: () => visitsApi.getByDate(dateStr),
  });

  const { data: snapshot } = useQuery({
    queryKey: ['snapshot', dateStr],
    queryFn: () => dayApi.getSnapshot(dateStr),
  });

  // Fetch monthly snapshots for calendar
  const { data: monthSnapshots = [] } = useQuery({
    queryKey: ['snapshots', monthStart, monthEnd],
    queryFn: () => dayApi.getSnapshots(monthStart, monthEnd),
    enabled: viewMode === 'calendar',
  });

  // Fetch monthly visits for calendar
  const { data: monthVisits = [] } = useQuery({
    queryKey: ['visits-range', monthStart, monthEnd],
    queryFn: () => visitsApi.getByDateRange(monthStart, monthEnd),
    enabled: viewMode === 'calendar',
  });

  // Fetch images for the visit being edited
  const { data: visitImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['gallery', 'visit', editingVisit?.id],
    queryFn: () => galleryApi.getAll({ visitId: editingVisit!.id }),
    enabled: !!editingVisit,
  });

  // Build calendar grid data
  const calendarDays = useMemo((): CalendarDayData[] => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get day of week for first day (0 = Sunday, we want Monday = 0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days: CalendarDayData[] = [];
    const today = formatDate(new Date());

    // Create snapshot and visits lookup maps
    const snapshotMap = new Map<string, DailySnapshot>();
    monthSnapshots.forEach((s) => {
      const dateKey = s.snapshotDate.split('T')[0];
      snapshotMap.set(dateKey, s);
    });

    const visitsMap = new Map<string, { visitCount: number; noShowCount: number; revenue: number }>();
    monthVisits.forEach((v) => {
      const dateKey = v.visitDate.split('T')[0];
      const existing = visitsMap.get(dateKey) || { visitCount: 0, noShowCount: 0, revenue: 0 };
      if (v.status === 'completed') {
        existing.visitCount++;
        existing.revenue += Number(v.actualPrice ?? v.service.price);
      } else if (v.status === 'no_show') {
        existing.noShowCount++;
      }
      visitsMap.set(dateKey, existing);
    });

    // Add days from previous month to fill first week
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const dateStrLocal = formatDate(date);
      const snap = snapshotMap.get(dateStrLocal);
      const visitData = visitsMap.get(dateStrLocal) || { visitCount: 0, noShowCount: 0, revenue: 0 };

      days.push({
        date,
        dateStr: dateStrLocal,
        isCurrentMonth: false,
        isToday: dateStrLocal === today,
        snapshot: snap,
        ...visitData,
        isClosed: !!snap,
      });
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStrLocal = formatDate(date);
      const snap = snapshotMap.get(dateStrLocal);
      const visitData = visitsMap.get(dateStrLocal) || { visitCount: 0, noShowCount: 0, revenue: 0 };

      days.push({
        date,
        dateStr: dateStrLocal,
        isCurrentMonth: true,
        isToday: dateStrLocal === today,
        snapshot: snap,
        ...visitData,
        isClosed: !!snap,
      });
    }

    // Add days from next month to complete last week
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i);
        const dateStrLocal = formatDate(date);
        const snap = snapshotMap.get(dateStrLocal);
        const visitData = visitsMap.get(dateStrLocal) || { visitCount: 0, noShowCount: 0, revenue: 0 };

        days.push({
          date,
          dateStr: dateStrLocal,
          isCurrentMonth: false,
          isToday: dateStrLocal === today,
          snapshot: snap,
          ...visitData,
          isClosed: !!snap,
        });
      }
    }

    return days;
  }, [calendarMonth, monthSnapshots, monthVisits]);

  const createVisitMutation = useMutation({
    mutationFn: visitsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['visits-range'] });
      toast.success('Wizyta dodana');
    },
    onError: () => {
      toast.error('Nie udało się dodać wizyty');
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: 'completed' | 'no_show' | 'cancelled' } }) =>
      visitsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['visits-range'] });
    },
  });

  const editVisitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { actualPrice?: number; notes?: string } }) =>
      visitsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['visits-range'] });
      setEditingVisit(null);
      toast.success('Wizyta zaktualizowana');
    },
    onError: () => {
      toast.error('Nie udało się zaktualizować wizyty');
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: visitsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['visits-range'] });
      toast.success('Wizyta usunięta');
    },
  });

  const closeDayMutation = useMutation({
    mutationFn: () => dayApi.closeDay(dateStr),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['snapshot', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      setShowCloseDialog(false);
      toast.success(`Dzień zamknięty! Zysk netto: ${data.breakdown.netProfit.toFixed(2)} zł`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Nie udało się zamknąć dnia');
    },
  });

  const reopenDayMutation = useMutation({
    mutationFn: () => dayApi.reopenDay(dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshot', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['visits', dateStr] });
      setShowReopenDialog(false);
      toast.success('Dzień został otwarty ponownie');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Nie udało się otworzyć dnia');
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: servicesApi.toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) =>
      galleryApi.upload(file, { visitId: editingVisit!.id, isPortfolio: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery', 'visit', editingVisit?.id] });
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      toast.success('Zdjęcie dodane');
    },
    onError: () => {
      toast.error('Nie udało się dodać zdjęcia');
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: galleryApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery', 'visit', editingVisit?.id] });
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      toast.success('Zdjęcie usunięte');
    },
    onError: () => {
      toast.error('Nie udało się usunąć zdjęcia');
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent, serviceId: string) => {
    e.stopPropagation();
    toggleFavoriteMutation.mutate(serviceId);
  };

  const handleServiceClick = (serviceId: string) => {
    if (snapshot) {
      toast.error('Ten dzień jest już zamknięty');
      return;
    }
    createVisitMutation.mutate({
      serviceId,
      visitDate: dateStr,
      status: 'completed',
    });
  };

  const handleToggleNoShow = (visitId: string, currentStatus: string) => {
    if (snapshot) return;
    const newStatus: 'completed' | 'no_show' = currentStatus === 'no_show' ? 'completed' : 'no_show';
    updateVisitMutation.mutate({ id: visitId, data: { status: newStatus } });
  };

  const handleDeleteVisit = (visitId: string) => {
    if (snapshot) return;
    deleteVisitMutation.mutate(visitId);
  };

  const handleOpenEditModal = (visit: Visit) => {
    if (snapshot) return;
    setEditingVisit(visit);
    setEditPrice(String(visit.actualPrice ?? visit.service.price));
    setEditNotes(visit.notes || '');
  };

  const handleSaveVisitEdit = () => {
    if (!editingVisit) return;
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error('Podaj poprawną cenę');
      return;
    }
    editVisitMutation.mutate({
      id: editingVisit.id,
      data: {
        actualPrice: newPrice,
        notes: editNotes.trim() || undefined,
      },
    });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setCalendarMonth(new Date());
  };

  const goToPreviousMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const handleCalendarDayClick = (dayData: CalendarDayData) => {
    setSelectedDate(dayData.date);
    setViewMode('day');
  };

  const completedVisits = visits.filter((v) => v.status === 'completed');
  const noShowVisits = visits.filter((v) => v.status === 'no_show');

  // Group services by category
  const groupedServices = useMemo(() => {
    const groups: { category: ServiceCategory | null; services: Service[] }[] = [];

    // Services with categories
    const categorizedServices = new Map<string, Service[]>();
    const uncategorizedServices: Service[] = [];

    services.forEach((service) => {
      if (service.categoryId) {
        const existing = categorizedServices.get(service.categoryId) || [];
        existing.push(service);
        categorizedServices.set(service.categoryId, existing);
      } else {
        uncategorizedServices.push(service);
      }
    });

    // Add categorized services in order
    categories.forEach((category) => {
      const categoryServices = categorizedServices.get(category.id) || [];
      if (categoryServices.length > 0) {
        groups.push({ category, services: categoryServices });
      }
    });

    // Add uncategorized at the end
    if (uncategorizedServices.length > 0) {
      groups.push({ category: null, services: uncategorizedServices });
    }

    return groups;
  }, [services, categories]);

  const hasCategories = categories.length > 0 && groupedServices.some((g) => g.category !== null);

  const todayRevenue = completedVisits.reduce((sum, visit) => {
    const price = Number(visit.actualPrice ?? visit.service.price);
    return sum + price;
  }, 0);

  const isToday = formatDate(new Date()) === dateStr;
  const isClosed = !!snapshot;

  // Calculate month totals for calendar header
  const monthTotals = useMemo(() => {
    return calendarDays
      .filter((d) => d.isCurrentMonth)
      .reduce(
        (acc, d) => ({
          visits: acc.visits + d.visitCount,
          revenue: acc.revenue + d.revenue,
          closedDays: acc.closedDays + (d.isClosed ? 1 : 0),
        }),
        { visits: 0, revenue: 0, closedDays: 0 }
      );
  }, [calendarDays]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        icon={Calendar}
        title="Wizyty"
        description="Zarządzaj wizytami i śledź przychody"
      />

      {/* View toggle and navigation */}
      <div className="flex items-center justify-between">
        {viewMode === 'day' ? (
          <>
            <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <button onClick={goToToday} className="flex items-center gap-2 overflow-hidden">
              <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={dateStr}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="font-medium capitalize"
                >
                  {formatDisplayDate(selectedDate)}
                </motion.span>
              </AnimatePresence>
              {isToday && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded flex-shrink-0"
                >
                  Dziś
                </motion.span>
              )}
            </button>
            <Button variant="ghost" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <button onClick={goToToday} className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium capitalize">{formatMonthYear(calendarMonth)}</span>
            </button>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* View mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setViewMode('day')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors',
            viewMode === 'day' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <List className="h-4 w-4" />
          Dzień
        </button>
        <button
          onClick={() => {
            setViewMode('calendar');
            setCalendarMonth(selectedDate);
          }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors',
            viewMode === 'calendar' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Kalendarz
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {viewMode === 'calendar' ? (
        /* Calendar View */
        <motion.div
          key="calendar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-4"
        >
          {/* Month summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{monthTotals.visits}</p>
                  <p className="text-xs text-muted-foreground">Wizyt</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{monthTotals.closedDays}</p>
                  <p className="text-xs text-muted-foreground">Dni zamkn.</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{formatPLNCompact(monthTotals.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Przychód</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar grid */}
          <Card>
            <CardContent className="p-3">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayData) => (
                  <button
                    key={dayData.dateStr}
                    onClick={() => handleCalendarDayClick(dayData)}
                    className={cn(
                      'relative aspect-square p-1 rounded-lg flex flex-col items-center justify-start transition-colors',
                      dayData.isCurrentMonth ? 'hover:bg-muted' : 'opacity-40 hover:opacity-60',
                      dayData.isToday && 'ring-2 ring-primary ring-offset-1',
                      dayData.dateStr === dateStr && 'bg-primary/10'
                    )}
                  >
                    {/* Day number */}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        dayData.isToday && 'text-primary',
                        !dayData.isCurrentMonth && 'text-muted-foreground'
                      )}
                    >
                      {dayData.date.getDate()}
                    </span>

                    {/* Indicators */}
                    {(dayData.visitCount > 0 || dayData.isClosed) && (
                      <div className="flex flex-col items-center gap-0.5 mt-0.5">
                        {dayData.visitCount > 0 && (
                          <span className="text-[10px] font-medium text-primary">
                            {dayData.visitCount}
                          </span>
                        )}
                        {dayData.isClosed && (
                          <Lock className="h-2.5 w-2.5 text-green-600" />
                        )}
                        {dayData.noShowCount > 0 && (
                          <span className="text-[10px] font-medium text-red-500">
                            -{dayData.noShowCount}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                    3
                  </div>
                  <span>Wizyty</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-green-600" />
                  <span>Zamknięty</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-500 font-medium">-1</span>
                  <span>No-show</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        /* Day View */
        <motion.div
          key="day"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={dateStr}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-4"
            >
          {/* Day status */}
          {isClosed && (
            <Card className="border-green-200/60 bg-green-50/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                    <span>Zamknięty</span>
                    <span className="text-foreground font-medium">
                      {Number(snapshot.netProfit).toFixed(0)} zł netto
                    </span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReopenDialog(true)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cofnij
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{completedVisits.length}</p>
                  <p className="text-xs text-muted-foreground">Wizyt</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{noShowVisits.length}</p>
                  <p className="text-xs text-muted-foreground">No-show</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{formatPLNCompact(todayRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Przychód</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dodaj wizytę</CardTitle>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Ładowanie usług...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Scissors className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="font-medium">Brak usług</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dodaj usługi w Ustawieniach, aby móc logować wizyty
                  </p>
                </div>
              ) : hasCategories ? (
                <div className="w-full">
                  <div className="flex gap-1 p-1 bg-muted rounded-lg mb-3 flex-wrap">
                    {groupedServices.map((group, index) => (
                      <button
                        key={group.category?.id || 'uncategorized'}
                        type="button"
                        onClick={() => setActiveCategory(group.category?.id || 'uncategorized')}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                          (activeCategory === (group.category?.id || 'uncategorized') ||
                           (activeCategory === null && index === 0))
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {group.category?.name || 'Inne'}
                      </button>
                    ))}
                  </div>
                  {groupedServices.map((group, index) => {
                    const isActive = activeCategory === (group.category?.id || 'uncategorized') ||
                                    (activeCategory === null && index === 0);
                    if (!isActive) return null;
                    return (
                      <ServiceGrid
                        key={group.category?.id || 'uncategorized'}
                        services={group.services}
                        visits={visits}
                        isClosed={isClosed}
                        isPending={createVisitMutation.isPending}
                        onServiceClick={handleServiceClick}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    );
                  })}
                </div>
              ) : (
                <ServiceGrid
                  services={services}
                  visits={visits}
                  isClosed={isClosed}
                  isPending={createVisitMutation.isPending}
                  onServiceClick={handleServiceClick}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
            </CardContent>
          </Card>

          {/* Today's visits list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lista wizyt</CardTitle>
            </CardHeader>
            <CardContent>
              {visits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="font-medium">Brak wizyt</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kliknij na usługę powyżej, aby dodać wizytę
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visits.map((visit) => {
                    const hasCustomPrice = visit.actualPrice !== null && visit.actualPrice !== Number(visit.service.price);
                    const hasImage = visit.images && visit.images.length > 0;
                    return (
                      <div
                        key={visit.id}
                        className={cn(
                          'rounded-xl border overflow-hidden',
                          visit.status === 'completed'
                            ? 'border-border bg-card'
                            : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50'
                        )}
                      >
                        {/* Main visit info - clickable to edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(visit)}
                          disabled={isClosed}
                          className={cn(
                            'w-full p-3 flex items-center justify-between text-left transition-colors',
                            !isClosed && 'hover:bg-muted/50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* Thumbnail or status icon */}
                            {hasImage ? (
                              <div className="relative">
                                <img
                                  src={visit.images![0].thumbnailUrl}
                                  alt=""
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                                <div
                                  className={cn(
                                    'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-white',
                                    visit.status === 'completed'
                                      ? 'bg-green-500'
                                      : 'bg-red-500'
                                  )}
                                >
                                  {visit.status === 'completed' ? (
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  ) : (
                                    <UserX className="h-2.5 w-2.5 text-white" />
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  'h-10 w-10 rounded-full flex items-center justify-center',
                                  visit.status === 'completed'
                                    ? 'bg-muted'
                                    : 'bg-red-50 dark:bg-red-900/20'
                                )}
                              >
                                {visit.status === 'completed' ? (
                                  <Check className="h-5 w-5 text-primary" />
                                ) : (
                                  <UserX className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                            )}
                            <div>
                              <p className="font-medium flex items-center gap-1.5">
                                {visit.service.name}
                                {hasImage && (
                                  <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                )}
                              </p>
                              {visit.notes ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 max-w-[180px]">
                                  <MessageSquare className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{visit.notes}</span>
                                </p>
                              ) : (
                                <p
                                  className={cn(
                                    'text-xs',
                                    visit.status === 'completed'
                                      ? 'text-muted-foreground'
                                      : 'text-red-600 dark:text-red-400'
                                  )}
                                >
                                  {visit.status === 'completed' ? 'Wykonana' : 'Nieodwołana wizyta'}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p
                                className={cn(
                                  'font-bold text-lg',
                                  visit.status === 'no_show' && 'text-red-600 dark:text-red-400 line-through'
                                )}
                              >
                                {formatPLNCompact(visit.actualPrice ?? visit.service.price)}
                              </p>
                              {hasCustomPrice && (
                                <p className="text-[10px] text-muted-foreground line-through">
                                  {formatPLNCompact(visit.service.price)}
                                </p>
                              )}
                            </div>
                            {!isClosed && (
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {/* Actions row */}
                        {!isClosed && (
                          <div className="border-t border-border/50 flex">
                            <button
                              onClick={() => handleToggleNoShow(visit.id, visit.status)}
                              className={cn(
                                'flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors',
                                visit.status === 'completed'
                                  ? 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400'
                                  : 'hover:bg-green-50 dark:hover:bg-green-950/30 text-green-600 dark:text-green-400'
                              )}
                            >
                              {visit.status === 'completed' ? (
                                <>
                                  <UserX className="h-3.5 w-3.5" />
                                  Oznacz no-show
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  Oznacz wykonaną
                                </>
                              )}
                            </button>
                            <div className="w-px bg-border/50" />
                            <button
                              onClick={() => handleDeleteVisit(visit.id)}
                              className="flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 text-muted-foreground hover:bg-muted/50 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Usuń wizytę
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Close day button */}
          {visits.length > 0 && !isClosed && (
            <Button className="w-full" size="lg" onClick={() => setShowCloseDialog(true)}>
              Zamknij dzień
            </Button>
          )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Close day dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zamknij dzień</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz zamknąć dzień {formatDisplayDate(selectedDate)}? Ta operacja obliczy
              Twój zysk netto i zapisze podsumowanie dnia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex justify-between">
              <span>Wizyt:</span>
              <span className="font-medium">{completedVisits.length}</span>
            </div>
            <div className="flex justify-between">
              <span>No-show:</span>
              <span className="font-medium text-red-500">{noShowVisits.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Przychód brutto:</span>
              <span className="font-medium">{formatPLNCompact(todayRevenue)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={() => closeDayMutation.mutate()} disabled={closeDayMutation.isPending}>
              {closeDayMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zamknij dzień
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen day dialog */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cofnij zamknięcie dnia</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz otworzyć ponownie dzień {formatDisplayDate(selectedDate)}?
              Będziesz mógł edytować wizyty i zamknąć dzień ponownie.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenDialog(false)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() => reopenDayMutation.mutate()}
              disabled={reopenDayMutation.isPending}
            >
              {reopenDayMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Otwórz dzień
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit visit dialog */}
      <Dialog open={!!editingVisit} onOpenChange={(open) => !open && setEditingVisit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj wizytę</DialogTitle>
            <DialogDescription>
              {editingVisit?.service.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Cena (zł)</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder={String(editingVisit?.service.price || '')}
              />
              {editingVisit && Number(editPrice) !== Number(editingVisit.service.price) && (
                <p className="text-xs text-muted-foreground">
                  Cena z cennika: {formatPLNCompact(editingVisit.service.price)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notatka (opcjonalna)</Label>
              <textarea
                id="edit-notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Np. klientka regularna, zniżka 10%..."
              />
            </div>
            <div className="space-y-2">
              <Label>Zdjęcia</Label>
              <div className="flex flex-wrap gap-2">
                {imagesLoading ? (
                  <div className="h-16 w-16 rounded-md border border-dashed flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {visitImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.thumbnailUrl}
                          alt=""
                          className="h-16 w-16 rounded-md object-cover border"
                        />
                        <button
                          type="button"
                          onClick={() => deleteImageMutation.mutate(image.id)}
                          disabled={deleteImageMutation.isPending}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadImageMutation.isPending}
                      className="h-16 w-16 rounded-md border border-dashed flex items-center justify-center hover:bg-muted/50 transition-colors"
                    >
                      {uploadImageMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVisit(null)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveVisitEdit} disabled={editVisitMutation.isPending}>
              {editVisitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
