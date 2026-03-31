import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dayApi } from '@/api/day';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';
import { formatPLN, formatPLNCompact } from '@/lib/format';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Users,
  UserX,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

export function SimulatorPage() {
  const now = new Date();
  const [priceIncrease, setPriceIncrease] = useState(0);
  const [extraVisitsPerWeek, setExtraVisitsPerWeek] = useState(0);
  const [noShowReduction, setNoShowReduction] = useState(0);
  const [showTipsDialog, setShowTipsDialog] = useState(false);

  const { data: monthData, isLoading: monthLoading } = useQuery({
    queryKey: ['month-summary', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => dayApi.getMonthSummary(now.getFullYear(), now.getMonth() + 1),
  });

  // Calculate projections
  const projections = useMemo(() => {
    if (!monthData) return null;

    const currentNetProfit = monthData.netProfit;
    const currentRevenue = monthData.revenue;
    const currentVisits = monthData.visitCount;
    const currentNoShows = monthData.noShowCount;
    const currentNoShowCost = monthData.noShowCost;
    const daysWorked = monthData.daysWorked || 1;

    // Average price per visit
    const avgPrice = currentVisits > 0 ? currentRevenue / currentVisits : 0;

    // Calculate extra revenue from price increase
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - new Date().getDate();
    const avgVisitsPerDay = currentVisits / daysWorked;
    const projectedRemainingVisits = avgVisitsPerDay * daysRemaining;

    // Revenue from price increase on remaining visits
    const priceIncreaseRevenue = projectedRemainingVisits * priceIncrease;

    // Extra visits revenue
    const weeksRemaining = daysRemaining / 7;
    const extraVisits = extraVisitsPerWeek * weeksRemaining;
    const extraVisitsRevenue = extraVisits * avgPrice;

    // No-show recovery
    const projectedNoShows = (currentNoShows / daysWorked) * daysRemaining;
    const noShowsRecovered = projectedNoShows * (noShowReduction / 100);
    const avgNoShowCost = currentNoShows > 0 ? currentNoShowCost / currentNoShows : avgPrice;
    const noShowRecoveryRevenue = noShowsRecovered * avgNoShowCost;

    // Total projected additional profit
    const profitMargin = currentRevenue > 0 ? currentNetProfit / currentRevenue : 0.6;
    const additionalRevenue = priceIncreaseRevenue + extraVisitsRevenue + noShowRecoveryRevenue;
    const additionalProfit = additionalRevenue * profitMargin;

    const projectedNetProfit = currentNetProfit + additionalProfit;

    return {
      current: currentNetProfit,
      projected: projectedNetProfit,
      difference: projectedNetProfit - currentNetProfit,
      percentChange: currentNetProfit > 0
        ? ((projectedNetProfit - currentNetProfit) / currentNetProfit) * 100
        : 0,
      breakdown: {
        priceIncrease: priceIncreaseRevenue * profitMargin,
        extraVisits: extraVisitsRevenue * profitMargin,
        noShowRecovery: noShowRecoveryRevenue * profitMargin,
      },
      avgPrice,
      avgVisitsPerDay,
      weeksRemaining,
    };
  }, [monthData, priceIncrease, extraVisitsPerWeek, noShowReduction, now]);

  if (monthLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasNoData = !monthData || monthData.daysWorked === 0;
  const hasChanges = projections && projections.difference > 0;

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        icon={Calculator}
        title="Symulator"
        description="Co by bylo gdyby..."
      />

      {hasNoData ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium">Brak danych do symulacji</p>
            <p className="text-sm text-muted-foreground mt-1">
              Zacznij logowac wizyty i zamykac dni, aby moc korzystac z symulatora
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Sliders - always first */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Dostosuj parametry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Price increase */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    Podwyzka cen
                  </Label>
                  <span className="text-sm font-bold text-blue-600">
                    +{priceIncrease} zl
                  </span>
                </div>
                <Slider
                  value={[priceIncrease]}
                  onValueChange={(value) => setPriceIncrease(Array.isArray(value) ? value[0] : value)}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Obecna srednia: {formatPLN(projections?.avgPrice || 0)}/wizyte
                </p>
              </div>

              {/* Extra visits */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-purple-500" />
                    Dodatkowe wizyty
                  </Label>
                  <span className="text-sm font-bold text-purple-600">
                    +{extraVisitsPerWeek}/tydz
                  </span>
                </div>
                <Slider
                  value={[extraVisitsPerWeek]}
                  onValueChange={(value) => setExtraVisitsPerWeek(Array.isArray(value) ? value[0] : value)}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Obecna srednia: {projections?.avgVisitsPerDay.toFixed(1) || 0} wizyt/dzien
                </p>
              </div>

              {/* No-show reduction */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm">
                    <UserX className="h-4 w-4 text-orange-500" />
                    Redukcja no-show
                  </Label>
                  <span className="text-sm font-bold text-orange-600">
                    -{noShowReduction}%
                  </span>
                </div>
                <Slider
                  value={[noShowReduction]}
                  onValueChange={(value) => setNoShowReduction(Array.isArray(value) ? value[0] : value)}
                  max={100}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Obecne no-show: {monthData?.noShowCount || 0} (strata {formatPLN(monthData?.noShowCost || 0)})
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results - comparison */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Obecny zysk</p>
                <p className="text-xl font-bold text-muted-foreground">
                  {formatPLNCompact(projections?.current || 0)}
                </p>
              </CardContent>
            </Card>
            <Card className={hasChanges ? "bg-emerald-50 border-emerald-200" : ""}>
              <CardContent className="p-4 text-center">
                <p className={`text-xs mb-1 ${hasChanges ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  Prognoza
                </p>
                <p className={`text-xl font-bold ${hasChanges ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                  {formatPLNCompact(projections?.projected || 0)}
                </p>
                {hasChanges && (
                  <p className="text-xs text-emerald-600 flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +{formatPLNCompact(projections.difference)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Breakdown - always visible */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Skad wzrost?</CardTitle>
            </CardHeader>
            <CardContent>
              {hasChanges ? (
                <div className="space-y-3">
                  {projections.breakdown.priceIncrease > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Podwyzka cen
                      </span>
                      <span className="font-medium text-blue-600">
                        +{formatPLN(projections.breakdown.priceIncrease)}
                      </span>
                    </div>
                  )}
                  {projections.breakdown.extraVisits > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        Dodatkowe wizyty
                      </span>
                      <span className="font-medium text-purple-600">
                        +{formatPLN(projections.breakdown.extraVisits)}
                      </span>
                    </div>
                  )}
                  {projections.breakdown.noShowRecovery > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        Redukcja no-show
                      </span>
                      <span className="font-medium text-orange-600">
                        +{formatPLN(projections.breakdown.noShowRecovery)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Przesun suwaki powyzej, aby zobaczyc projekcje wzrostu zysku
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tips button - always visible */}
          <Button
            onClick={() => setShowTipsDialog(true)}
            className="w-full"
            size="lg"
            variant={hasChanges ? "default" : "outline"}
            disabled={!hasChanges}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            {hasChanges ? "Jak to osiagnac?" : "Ustaw parametry powyzej"}
          </Button>

          {/* Tips Dialog */}
          <Dialog open={showTipsDialog} onOpenChange={setShowTipsDialog}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Jak osiagnac +{formatPLN(projections?.difference || 0)}?
                </DialogTitle>
                <DialogDescription>
                  Praktyczne wskazowki
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {priceIncrease > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-500" />
                      Podwyzka o {priceIncrease} zl
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                        Wprowadz stopniowo - najpierw dla nowych klientow
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                        Uzasadnij wartoscia - lepsza jakosc, produkty premium
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                        Pakiety lojalnosciowe dla stalych klientow
                      </li>
                    </ul>
                  </div>
                )}

                {extraVisitsPerWeek > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      +{extraVisitsPerWeek} wizyt/tydz
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                        Program polecen - rabat za nowego klienta
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                        Social media - przed/po, stories
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                        Google My Business - zbieraj opinie
                      </li>
                    </ul>
                  </div>
                )}

                {noShowReduction > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <UserX className="h-4 w-4 text-orange-500" />
                      -{noShowReduction}% no-show
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                        SMS 24h i 2h przed wizyta
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                        Zaliczki (50-100 zl) dla nowych
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                        Polityka: odwolanie min. 24h wczesniej
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <Button onClick={() => setShowTipsDialog(false)} className="w-full">
                Rozumiem
              </Button>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
