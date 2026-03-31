import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { fixedCostsApi } from '@/api/fixed-costs';
import { servicesApi } from '@/api/services';
import { categoriesApi } from '@/api/categories';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatPLN } from '@/lib/format';
import {
  User,
  Wallet,
  Scissors,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  LogOut,
  Receipt,
  FolderOpen,
} from 'lucide-react';
import type { FixedCost, CreateFixedCostDto } from '@/types/fixed-cost';
import type { Service, CreateServiceDto, ServiceCategory, CreateCategoryDto } from '@/types/service';

const TAX_FORMS = [
  { value: 'ryczalt', label: 'Ryczat', rates: [8.5, 12, 15] },
  { value: 'liniowy', label: 'Podatek liniowy', rates: [19] },
  { value: 'skala', label: 'Skala podatkowa', rates: [12, 32] },
];

const INDUSTRIES = [
  { value: 'nails', label: 'Paznokcie' },
  { value: 'hair', label: 'Fryzjerstwo' },
  { value: 'cosmetics', label: 'Kosmetyka' },
  { value: 'massage', label: 'Masaz' },
  { value: 'fitness', label: 'Fitness / Trener' },
  { value: 'other', label: 'Inne' },
];

export function SettingsPage() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'costs' | 'services' | 'categories'>('profile');

  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profil', icon: User },
    { id: 'costs' as const, label: 'Koszty', icon: Wallet },
    { id: 'services' as const, label: 'Uslugi', icon: Scissors },
    { id: 'categories' as const, label: 'Kategorie', icon: FolderOpen },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ustawienia</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Wyloguj
        </Button>
      </div>

      {/* Custom tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'costs' && <FixedCostsSettings />}
        {activeTab === 'services' && <ServicesSettings />}
        {activeTab === 'categories' && <CategoriesSettings />}
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [industry, setIndustry] = useState(user?.industry || '');
  const [city, setCity] = useState(user?.city || '');
  const [taxForm, setTaxForm] = useState(user?.taxForm || 'ryczalt');
  const [taxRate, setTaxRate] = useState(user?.taxRate?.toString() || '8.5');
  const [zusMonthly, setZusMonthly] = useState(user?.zusMonthly?.toString() || '0');

  const selectedTaxForm = TAX_FORMS.find((t) => t.value === taxForm);

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof usersApi.updateMe>[0]) => usersApi.updateMe(data),
    onSuccess: () => {
      toast.success('Profil zaktualizowany');
      refreshUser();
    },
    onError: () => {
      toast.error('Blad podczas aktualizacji profilu');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: name || undefined,
      businessName: businessName || undefined,
      industry: industry || undefined,
      city: city || undefined,
      taxForm,
      taxRate: parseFloat(taxRate),
      zusMonthly: parseFloat(zusMonthly),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dane profilu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Imie</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Twoje imie"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessName">Nazwa firmy</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Nazwa Twojej firmy"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Branza</Label>
          <Select value={industry} onValueChange={(v) => v && setIndustry(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz branze" />
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
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Twoje miasto"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="taxForm">Forma opodatkowania</Label>
            <Select value={taxForm} onValueChange={(v) => v && setTaxForm(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAX_FORMS.map((form) => (
                  <SelectItem key={form.value} value={form.value}>
                    {form.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxRate">Stawka podatku (%)</Label>
            <Select value={taxRate} onValueChange={(v) => v && setTaxRate(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectedTaxForm?.rates.map((rate) => (
                  <SelectItem key={rate} value={rate.toString()}>
                    {rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zusMonthly">Skladka ZUS miesiecznie (zl)</Label>
          <Input
            id="zusMonthly"
            type="number"
            value={zusMonthly}
            onChange={(e) => setZusMonthly(e.target.value)}
            placeholder="0"
          />
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            'Zapisz zmiany'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function FixedCostsSettings() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ['fixed-costs'],
    queryFn: fixedCostsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateFixedCostDto) => fixedCostsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-costs'] });
      toast.success('Koszt dodany');
      closeDialog();
    },
    onError: () => {
      toast.error('Blad podczas dodawania kosztu');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFixedCostDto> }) =>
      fixedCostsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-costs'] });
      toast.success('Koszt zaktualizowany');
      closeDialog();
    },
    onError: () => {
      toast.error('Blad podczas aktualizacji kosztu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fixedCostsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-costs'] });
      toast.success('Koszt usuniety');
    },
    onError: () => {
      toast.error('Blad podczas usuwania kosztu');
    },
  });

  const openDialog = (cost?: FixedCost) => {
    if (cost) {
      setEditingCost(cost);
      setName(cost.name);
      setAmount(cost.amount.toString());
    } else {
      setEditingCost(null);
      setName('');
      setAmount('');
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCost(null);
    setName('');
    setAmount('');
  };

  const handleSave = () => {
    if (!name.trim() || !amount) return;

    if (editingCost) {
      updateMutation.mutate({
        id: editingCost.id,
        data: { name: name.trim(), amount: parseFloat(amount) },
      });
    } else {
      createMutation.mutate({ name: name.trim(), amount: parseFloat(amount) });
    }
  };

  const totalCosts = costs.filter((c) => c.isActive).reduce((sum, c) => sum + Number(c.amount), 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Koszty stale</CardTitle>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            Dodaj
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Suma miesiecznie</p>
            <p className="text-2xl font-bold">{formatPLN(totalCosts)}</p>
          </div>

          {costs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium">Brak kosztow stalych</p>
              <p className="text-sm text-muted-foreground mt-1">
                Dodaj koszty takie jak czynsz, media, ZUS
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {costs.map((cost) => (
                <div
                  key={cost.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    cost.isActive ? 'bg-background' : 'bg-muted opacity-60'
                  }`}
                >
                  <div>
                    <p className="font-medium">{cost.name}</p>
                    <p className="text-sm text-muted-foreground">{formatPLN(cost.amount)}/mies.</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(cost)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(cost.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCost ? 'Edytuj koszt' : 'Dodaj koszt'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="costName">Nazwa</Label>
              <Input
                id="costName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Czynsz, Media, Ubezpieczenie"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costAmount">Kwota miesiecznie (zl)</Label>
              <Input
                id="costAmount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Anuluj
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !amount || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Zapisz'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ServicesSettings() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [materialCost, setMaterialCost] = useState('0');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateServiceDto) => servicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Usluga dodana');
      closeDialog();
    },
    onError: () => {
      toast.error('Blad podczas dodawania uslugi');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateServiceDto> }) =>
      servicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Usluga zaktualizowana');
      closeDialog();
    },
    onError: () => {
      toast.error('Blad podczas aktualizacji uslugi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Usluga usunieta');
    },
    onError: () => {
      toast.error('Blad podczas usuwania uslugi');
    },
  });

  const openDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setName(service.name);
      setPrice(service.price.toString());
      setDurationMinutes(service.durationMinutes.toString());
      setMaterialCost(service.materialCost.toString());
      setCategoryId(service.categoryId || null);
    } else {
      setEditingService(null);
      setName('');
      setPrice('');
      setDurationMinutes('60');
      setMaterialCost('0');
      setCategoryId(null);
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingService(null);
    setName('');
    setPrice('');
    setDurationMinutes('60');
    setMaterialCost('0');
    setCategoryId(null);
  };

  const handleSave = () => {
    if (!name.trim() || !price) return;

    const data = {
      name: name.trim(),
      price: parseFloat(price),
      durationMinutes: parseInt(durationMinutes),
      materialCost: parseFloat(materialCost) || 0,
      categoryId: categoryId || null,
    };

    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Cennik uslug</CardTitle>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            Dodaj
          </Button>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Scissors className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium">Brak uslug</p>
              <p className="text-sm text-muted-foreground mt-1">
                Dodaj uslugi z cennika, aby moc logowac wizyty
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    service.isActive ? 'bg-background' : 'bg-muted opacity-60'
                  }`}
                >
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span>{formatPLN(service.price)}</span>
                      <span>|</span>
                      <span>{service.durationMinutes} min</span>
                      {Number(service.materialCost) > 0 && (
                        <>
                          <span>|</span>
                          <span>Mat: {formatPLN(service.materialCost)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(service)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(service.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edytuj usluge' : 'Dodaj usluge'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Nazwa</Label>
              <Input
                id="serviceName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Manicure hybrydowy"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="servicePrice">Cena (zl)</Label>
                <Input
                  id="servicePrice"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceDuration">Czas (min)</Label>
                <Input
                  id="serviceDuration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceMaterialCost">Koszt materialow (zl)</Label>
              <Input
                id="serviceMaterialCost"
                type="number"
                value={materialCost}
                onChange={(e) => setMaterialCost(e.target.value)}
                placeholder="0"
              />
            </div>
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="serviceCategory">Kategoria</Label>
                <Select
                  value={categoryId || 'none'}
                  onValueChange={(v) => setCategoryId(v === 'none' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Bez kategorii</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Anuluj
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !price || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Zapisz'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoriesSettings() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [name, setName] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCategoryDto) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategoria dodana');
      closeDialog();
    },
    onError: () => {
      toast.error('Blad podczas dodawania kategorii');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryDto> }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategoria zaktualizowana');
      closeDialog();
    },
    onError: () => {
      toast.error('Blad podczas aktualizacji kategorii');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategoria usunieta');
    },
    onError: () => {
      toast.error('Blad podczas usuwania kategorii');
    },
  });

  const openDialog = (category?: ServiceCategory) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
    } else {
      setEditingCategory(null);
      setName('');
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setName('');
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        data: { name: name.trim() },
      });
    } else {
      createMutation.mutate({ name: name.trim() });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Kategorie uslug</CardTitle>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            Dodaj
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Grupuj uslugi w kategorie dla lepszej organizacji na stronie wizyt.
          </p>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium">Brak kategorii</p>
              <p className="text-sm text-muted-foreground mt-1">
                Dodaj kategorie takie jak "Manicure", "Pedicure", "Zabiegi"
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background"
                >
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {category.services?.length || 0} uslug
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(category.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edytuj kategorie' : 'Dodaj kategorie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Nazwa</Label>
              <Input
                id="categoryName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Manicure, Pedicure, Zabiegi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Anuluj
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Zapisz'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
