import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { fixedCostsApi } from '@/api/fixed-costs';
import { servicesApi } from '@/api/services';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { INDUSTRIES, TAX_FORMS, DEFAULT_ZUS, SUGGESTED_COSTS, SUGGESTED_SERVICES } from '@/lib/constants';

interface CostItem {
  id: string;
  name: string;
  amount: number;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration: number;
  materialCost: number;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Profile
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [taxForm, setTaxForm] = useState('ryczalt');
  const [zusMonthly, setZusMonthly] = useState(DEFAULT_ZUS);

  // Step 2: Costs
  const [costs, setCosts] = useState<CostItem[]>([]);

  // Step 3: Services
  const [services, setServices] = useState<ServiceItem[]>([]);

  const updateUserMutation = useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: (data) => {
      setUser(data);
    },
  });

  const handleIndustryChange = (value: string | null) => {
    if (!value) return;
    setIndustry(value);
    // Load suggested costs
    const suggestions = SUGGESTED_COSTS[value] || SUGGESTED_COSTS.default;
    setCosts(suggestions.map((c, i) => ({ id: `cost-${i}`, ...c })));
    // Load suggested services
    const serviceSuggestions = SUGGESTED_SERVICES[value] || SUGGESTED_SERVICES.default;
    setServices(serviceSuggestions.map((s, i) => ({ id: `service-${i}`, ...s })));
  };

  const addCost = () => {
    setCosts([...costs, { id: `cost-${Date.now()}`, name: '', amount: 0 }]);
  };

  const removeCost = (id: string) => {
    setCosts(costs.filter((c) => c.id !== id));
  };

  const updateCost = (id: string, field: 'name' | 'amount', value: string | number) => {
    setCosts(costs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const addService = () => {
    setServices([...services, { id: `service-${Date.now()}`, name: '', price: 0, duration: 60, materialCost: 0 }]);
  };

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const updateService = (id: string, field: keyof ServiceItem, value: string | number) => {
    setServices(services.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const totalCosts = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const handleStep1Next = async () => {
    const selectedTaxForm = TAX_FORMS.find((t) => t.value === taxForm);
    await updateUserMutation.mutateAsync({
      name,
      businessName,
      industry,
      city,
      taxForm,
      taxRate: selectedTaxForm?.rate || 8.5,
      zusMonthly,
    });
    setStep(2);
  };

  const handleStep2Next = async () => {
    setIsSubmitting(true);
    try {
      // Create all costs
      for (const cost of costs.filter((c) => c.name && c.amount > 0)) {
        await fixedCostsApi.create({ name: cost.name, amount: cost.amount });
      }
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // Create all services
      for (const service of services.filter((s) => s.name && s.price > 0)) {
        await servicesApi.create({
          name: service.name,
          price: service.price,
          durationMinutes: service.duration,
          materialCost: service.materialCost,
        });
      }
      // Mark onboarding as completed
      await updateUserMutation.mutateAsync({ onboardingCompleted: true });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate('/app');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-lg mx-auto">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <Check className="h-5 w-5" /> : s}
            </div>
          ))}
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Krok 1: Profil biznesu</CardTitle>
              <CardDescription>Podstawowe informacje o Twojej działalności</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Twoje imię</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anna" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Nazwa biznesu (opcjonalnie)</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Studio Urody Anna"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Branża</Label>
                <Select value={industry} onValueChange={handleIndustryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz branżę" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Miasto</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Warszawa" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxForm">Forma opodatkowania</Label>
                <Select value={taxForm} onValueChange={(v) => v && setTaxForm(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_FORMS.map((tax) => (
                      <SelectItem key={tax.value} value={tax.value}>
                        {tax.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zus">Składka ZUS miesięcznie (zł)</Label>
                <Input
                  id="zus"
                  type="number"
                  value={zusMonthly}
                  onChange={(e) => setZusMonthly(Number(e.target.value))}
                  placeholder="1600"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleStep1Next}
                disabled={!industry || updateUserMutation.isPending}
                className="w-full"
              >
                {updateUserMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Dalej <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Fixed Costs */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Krok 2: Koszty stałe</CardTitle>
              <CardDescription>Dodaj miesięczne koszty prowadzenia działalności</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {costs.map((cost) => (
                <div key={cost.id} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      value={cost.name}
                      onChange={(e) => updateCost(cost.id, 'name', e.target.value)}
                      placeholder="Nazwa kosztu"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      value={cost.amount || ''}
                      onChange={(e) => updateCost(cost.id, 'amount', Number(e.target.value))}
                      placeholder="Kwota"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeCost(cost.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addCost} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Dodaj koszt
              </Button>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Suma kosztów stałych:</p>
                <p className="text-xl font-bold">{totalCosts.toLocaleString('pl-PL')} zł/mies.</p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Wstecz
              </Button>
              <Button onClick={handleStep2Next} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Dalej'}
                {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Services */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Krok 3: Cennik usług</CardTitle>
              <CardDescription>Dodaj swoje usługi wraz z cenami i czasem trwania</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.map((service) => (
                <div key={service.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={service.name}
                      onChange={(e) => updateService(service.id, 'name', e.target.value)}
                      placeholder="Nazwa usługi"
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeService(service.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Cena (zł)</Label>
                      <Input
                        type="number"
                        value={service.price || ''}
                        onChange={(e) => updateService(service.id, 'price', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Czas (min)</Label>
                      <Input
                        type="number"
                        value={service.duration || ''}
                        onChange={(e) => updateService(service.id, 'duration', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Materiały (zł)</Label>
                      <Input
                        type="number"
                        value={service.materialCost || ''}
                        onChange={(e) => updateService(service.id, 'materialCost', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addService} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Dodaj usługę
              </Button>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Wstecz
              </Button>
              <Button onClick={handleFinish} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Zakończ <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
