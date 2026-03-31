import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { dayApi } from '@/api/day';
import { dashboardApi } from '@/api/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from 'sonner';
import { formatPLN, formatPLNCompact, formatShortDate } from '@/lib/format';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calendar,
  AlertCircle,
  Users,
  Trophy,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Target,
  Scale,
  ArrowUp,
  ArrowDown,
  Sparkles,
  RefreshCw,
  Pencil,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { TutorialModal } from '@/components/tutorial-modal';
import { useTutorialStore } from '@/store/tutorial-store';

function formatMonthName(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleDateString('pl-PL', {
    month: 'long',
    year: 'numeric',
  });
}

function getMonthOffset(year: number, month: number, offset: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const SUGGESTION_CACHE_KEY = 'koly_suggestion_cache';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SuggestionCache {
  suggestion: string;
  category: string;
  generatedAt: string;
  dataHash: string;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  finance: { label: 'Finanse', color: 'bg-emerald-100 text-emerald-700' },
  marketing: { label: 'Marketing', color: 'bg-blue-100 text-blue-700' },
  operations: { label: 'Operacje', color: 'bg-amber-100 text-amber-700' },
  growth: { label: 'Rozwój', color: 'bg-purple-100 text-purple-700' },
};

export function DashboardPage() {
  const now = new Date();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // Tutorial
  const { hasSeenTutorial } = useTutorialStore();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Show tutorial only if user hasn't seen it
    if (!hasSeenTutorial) {
      // Small delay to let dashboard render first
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTutorial]);

  const previousMonth = getMonthOffset(selectedMonth.year, selectedMonth.month, -1);
  const isCurrentMonth =
    selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth() + 1;

  const goToPreviousMonth = () => {
    setSelectedMonth(getMonthOffset(selectedMonth.year, selectedMonth.month, -1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(getMonthOffset(selectedMonth.year, selectedMonth.month, 1));
  };

  const goToCurrentMonth = () => {
    setSelectedMonth({ year: now.getFullYear(), month: now.getMonth() + 1 });
  };

  const { data: currentData, isLoading: currentLoading } = useQuery({
    queryKey: ['month-summary', selectedMonth.year, selectedMonth.month],
    queryFn: () => dayApi.getMonthSummary(selectedMonth.year, selectedMonth.month),
  });

  const { data: previousData } = useQuery({
    queryKey: ['month-summary', previousMonth.year, previousMonth.month],
    queryFn: () => dayApi.getMonthSummary(previousMonth.year, previousMonth.month),
  });

  const { data: monthlyTrend = [] } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: () => dayApi.getMonthlyTrend(6),
  });

  const { data: goalProgress } = useQuery({
    queryKey: ['goal-progress'],
    queryFn: () => dayApi.getGoalProgress(),
  });

  const { data: benchmark } = useQuery({
    queryKey: ['benchmark'],
    queryFn: () => dayApi.getBenchmark(),
  });

  const setGoalMutation = useMutation({
    mutationFn: (goal: number) => dayApi.setGoal(goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-progress'] });
      setShowGoalDialog(false);
      setGoalInput('');
      toast.success('Cel został ustawiony');
    },
    onError: () => {
      toast.error('Nie udało się ustawić celu');
    },
  });

  const handleSetGoal = () => {
    const goal = parseFloat(goalInput);
    if (isNaN(goal) || goal < 0) {
      toast.error('Wprowadź poprawną kwotę');
      return;
    }
    setGoalMutation.mutate(goal);
  };

  const openGoalDialog = () => {
    setGoalInput(goalProgress?.goal?.toString() || '');
    setShowGoalDialog(true);
  };

  // Compute data hash for suggestion caching
  const dataHash = useMemo(() => {
    if (!currentData) return '';
    return JSON.stringify({
      daysWorked: currentData.daysWorked,
      revenue: currentData.revenue,
      visitCount: currentData.visitCount,
      noShowCount: currentData.noShowCount,
    });
  }, [currentData]);

  // Check if we need to fetch new suggestion
  const [cachedSuggestion, setCachedSuggestion] = useState<SuggestionCache | null>(null);
  const [shouldFetchSuggestion, setShouldFetchSuggestion] = useState(false);

  useEffect(() => {
    if (!dataHash || !isCurrentMonth) return;

    try {
      const cached = localStorage.getItem(SUGGESTION_CACHE_KEY);
      if (cached) {
        const parsedCache: SuggestionCache = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(parsedCache.generatedAt).getTime();

        if (parsedCache.dataHash === dataHash && cacheAge < CACHE_MAX_AGE_MS) {
          setCachedSuggestion(parsedCache);
          setShouldFetchSuggestion(false);
          return;
        }
      }
    } catch {
      // Invalid cache, fetch new
    }

    setShouldFetchSuggestion(true);
  }, [dataHash, isCurrentMonth]);

  const { data: suggestionData, isLoading: suggestionLoading, isFetching: suggestionFetching } = useQuery({
    queryKey: ['dashboard-suggestion'],
    queryFn: () => dashboardApi.getSuggestion(),
    enabled: shouldFetchSuggestion && isCurrentMonth && !!dataHash,
    staleTime: 0, // Always refetch when triggered
  });

  // Cache suggestion when received
  useEffect(() => {
    if (suggestionData && dataHash) {
      const cache: SuggestionCache = {
        suggestion: suggestionData.suggestion,
        category: suggestionData.category,
        generatedAt: suggestionData.generatedAt,
        dataHash,
      };
      localStorage.setItem(SUGGESTION_CACHE_KEY, JSON.stringify(cache));
      setCachedSuggestion(cache);
      setShouldFetchSuggestion(false);
    }
  }, [suggestionData, dataHash]);

  const currentSuggestion = suggestionData || cachedSuggestion;
  const isLoadingSuggestion = suggestionLoading || suggestionFetching;

  const handleRefreshSuggestion = () => {
    localStorage.removeItem(SUGGESTION_CACHE_KEY);
    setCachedSuggestion(null);
    // Invalidate query cache and trigger refetch
    queryClient.removeQueries({ queryKey: ['dashboard-suggestion'] });
    setShouldFetchSuggestion(true);
  };

  // Format monthly trend data for the chart
  const monthlyTrendData = monthlyTrend.map((item) => ({
    month: new Date(item.year, item.month - 1).toLocaleDateString('pl-PL', { month: 'short' }),
    zysk: item.netProfit,
    przychod: item.revenue,
    wizyty: item.visits,
  }));

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Prepare chart data from snapshots
  const chartData = currentData?.snapshots
    ?.map((snapshot) => ({
      date: formatShortDate(snapshot.snapshotDate),
      fullDate: snapshot.snapshotDate,
      zysk: Number(snapshot.netProfit),
      przychod: Number(snapshot.revenue),
      wizyty: snapshot.visitCount,
    }))
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()) || [];

  // Aggregate services ranking
  const servicesRanking = (() => {
    if (!currentData?.snapshots) return [];

    const servicesMap = new Map<
      string,
      { name: string; count: number; revenue: number; profit: number }
    >();

    currentData.snapshots.forEach((snapshot) => {
      if (snapshot.servicesRanking && Array.isArray(snapshot.servicesRanking)) {
        (snapshot.servicesRanking as Array<{ name: string; count: number; revenue: number; profit: number }>).forEach((service) => {
          const existing = servicesMap.get(service.name);
          if (existing) {
            existing.count += service.count;
            existing.revenue += service.revenue;
            existing.profit += service.profit;
          } else {
            servicesMap.set(service.name, { ...service });
          }
        });
      }
    });

    return Array.from(servicesMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  })();

  const maxProfit = Math.max(...servicesRanking.map((s) => s.profit), 1);

  const stats = currentData
    ? {
        netProfit: currentData.netProfit,
        netProfitChange: previousData
          ? calculateChange(currentData.netProfit, previousData.netProfit)
          : 0,
        revenue: currentData.revenue,
        revenueChange: previousData
          ? calculateChange(currentData.revenue, previousData.revenue)
          : 0,
        costs: currentData.materialCosts + currentData.fixedCostsDaily + currentData.estimatedTax,
        costsChange: previousData
          ? calculateChange(
              currentData.materialCosts + currentData.fixedCostsDaily + currentData.estimatedTax,
              previousData.materialCosts +
                previousData.fixedCostsDaily +
                previousData.estimatedTax
            )
          : 0,
        profitMargin:
          currentData.revenue > 0 ? (currentData.netProfit / currentData.revenue) * 100 : 0,
        visitCount: currentData.visitCount,
        noShowCount: currentData.noShowCount,
        noShowCost: currentData.noShowCost,
        daysWorked: currentData.daysWorked,
      }
    : null;

  return (
    <>
      <TutorialModal open={showTutorial} onClose={() => setShowTutorial(false)} />
      <div className="space-y-4 lg:space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Dashboard"
        description="Analiza finansów i statystyki"
      />

      {/* Loading skeleton or content */}
      <AnimatePresence mode="wait">
        {currentLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Skeleton className="h-[72px] w-full rounded-xl" />
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-[72px] w-full rounded-xl" />
            <Skeleton className="h-[120px] w-full rounded-xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 col-span-2 lg:col-span-2 rounded-xl" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 lg:space-y-6"
          >

      {/* AI Suggestion from Koly */}
      {isCurrentMonth && (isLoadingSuggestion || currentSuggestion) && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">Sugestia Koly</span>
                      <AnimatePresence mode="wait">
                        {currentSuggestion && (
                          <motion.span
                            key="category"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              categoryLabels[currentSuggestion.category]?.color || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {categoryLabels[currentSuggestion.category]?.label || currentSuggestion.category}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="min-h-[3rem]">
                      <AnimatePresence mode="wait" initial={false}>
                        {isLoadingSuggestion && !currentSuggestion ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2"
                          >
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </motion.div>
                        ) : (
                          <motion.p
                            key="suggestion"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-sm text-muted-foreground"
                          >
                            {currentSuggestion?.suggestion}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8"
                    onClick={handleRefreshSuggestion}
                    disabled={isLoadingSuggestion}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingSuggestion ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <button onClick={goToCurrentMonth} className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium capitalize">
            {formatMonthName(selectedMonth.year, selectedMonth.month)}
          </span>
          {isCurrentMonth && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Teraz</span>
          )}
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Goal progress card */}
      {isCurrentMonth && (
        goalProgress ? (
          <div>
              <Card
                className={
                  goalProgress.onTrack
                    ? 'border-emerald-200 bg-emerald-50'
                    : goalProgress.percentComplete < 50
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target
                        className={`h-4 w-4 ${
                          goalProgress.onTrack
                            ? 'text-emerald-600'
                            : goalProgress.percentComplete < 50
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      />
                      <span className="text-sm font-medium">Cel miesiąca</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{goalProgress.percentComplete}%</span>
                      <button
                        onClick={openGoalDialog}
                        className="p-1 hover:bg-white/50 rounded transition-colors"
                        title="Edytuj cel"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goalProgress.onTrack
                          ? 'bg-emerald-500'
                          : goalProgress.percentComplete < 50
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(goalProgress.percentComplete, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatPLNCompact(goalProgress.current)} / {formatPLNCompact(goalProgress.goal)}
                    </span>
                    <span>
                      {goalProgress.daysLeft > 0
                        ? `~${formatPLNCompact(goalProgress.dailyNeeded)}/dzień`
                        : 'Ostatni dzień!'}
                    </span>
                  </div>
                </CardContent>
              </Card>
          </div>
        ) : (
          <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/30">
            <CardContent className="p-4">
              <button
                onClick={openGoalDialog}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Ustaw cel na ten miesiąc</span>
              </button>
            </CardContent>
          </Card>
        )
      )}

      {/* Main metric */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6 text-center">
          <p className="text-sm opacity-80 mb-1">Zysk netto</p>
          <p className="text-4xl font-bold">{formatPLNCompact(stats?.netProfit || 0)}</p>
          {stats && previousData && (
            <div className="flex items-center justify-center gap-1 mt-2 text-sm">
              {stats.netProfitChange >= 0 ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span>+{stats.netProfitChange.toFixed(0)}% vs poprzedni miesiac</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4" />
                  <span>{stats.netProfitChange.toFixed(0)}% vs poprzedni miesiac</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Przychod</span>
            </div>
            <p className="text-xl font-bold">{formatPLNCompact(stats?.revenue || 0)}</p>
            {stats && previousData && (
              <p
                className={`text-xs flex items-center gap-0.5 ${
                  stats.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {stats.revenueChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {stats.revenueChange >= 0 ? '+' : ''}
                {stats.revenueChange.toFixed(0)}%
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Wizyty</span>
            </div>
            <p className="text-xl font-bold">{stats?.visitCount || 0}</p>
            <p className="text-xs text-muted-foreground">{stats?.daysWorked || 0} dni pracy</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              <span className="text-xs">Marza zysku</span>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xl font-bold">{stats?.profitMargin.toFixed(0) || 0}%</p>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(stats?.profitMargin || 0, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Industry benchmark */}
      {benchmark?.hasData && benchmark.metrics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Porównanie z branżą
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {benchmark.metrics.map((metric) => (
                <div key={metric.name}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">
                        {metric.user}{metric.unit}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (śr. {metric.industry}{metric.unit})
                      </span>
                      {metric.better ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  {metric.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{metric.description}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
              Dane branżowe na podstawie raportów WiseEuropa i TVN24 Biznes
            </p>
          </CardContent>
        </Card>
      )}

      {/* Trend chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trend zysku
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[180px] lg:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    itemStyle={{
                      color: 'hsl(var(--foreground))',
                    }}
                    formatter={(value) => [formatPLN(Number(value)), 'Zysk']}
                    labelFormatter={(label) => String(label)}
                  />
                  <Area
                    type="monotone"
                    dataKey="zysk"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#profitGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly trend chart */}
      {monthlyTrendData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Trend miesięczny
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[180px] lg:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    itemStyle={{
                      color: 'hsl(var(--foreground))',
                    }}
                    formatter={(value, name) => [
                      formatPLN(Number(value)),
                      name === 'zysk' ? 'Zysk netto' : 'Przychód',
                    ]}
                  />
                  <Bar dataKey="zysk" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No-show warning */}
      {stats && stats.noShowCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">
                  {stats.noShowCount} nieodwołanych wizyt
                </p>
                <p className="text-sm text-red-600">
                  Utracony przychód: {formatPLN(stats.noShowCost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services ranking */}
      {servicesRanking.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Ranking uslug
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {servicesRanking.map((service, index) => (
                <div key={service.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 1
                            ? 'bg-gray-100 text-gray-700'
                            : index === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatPLNCompact(service.profit)}</p>
                      <p className="text-xs text-muted-foreground">{service.count} wizyt</p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden ml-7">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(service.profit / maxProfit) * 100}%`,
                        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {stats && stats.daysWorked === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium">Brak danych za ten miesiac</p>
            <p className="text-sm text-muted-foreground mt-1">
              Zacznij logowac wizyty i zamykac dni, aby zobaczyc statystyki
            </p>
          </CardContent>
        </Card>
      )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal setting dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {goalProgress ? 'Edytuj cel miesięczny' : 'Ustaw cel miesięczny'}
            </DialogTitle>
            <DialogDescription>
              Określ ile chcesz zarobić (zysk netto) w tym miesiącu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal">Cel zysku netto (zł)</Label>
              <Input
                id="goal"
                type="number"
                min="0"
                step="100"
                placeholder="np. 8000"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
              />
            </div>
            {goalProgress && (
              <p className="text-sm text-muted-foreground">
                Obecny postęp: {formatPLN(goalProgress.current)} ({goalProgress.percentComplete}%)
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGoalDialog(false)}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSetGoal}
              disabled={setGoalMutation.isPending}
            >
              {setGoalMutation.isPending ? 'Zapisuję...' : 'Zapisz cel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
