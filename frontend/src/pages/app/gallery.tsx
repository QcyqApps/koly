import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { galleryApi } from '@/api/gallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Trash2,
  ImageIcon,
  Images,
  Calendar,
  Upload,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { GalleryImage, GeneratedCaption } from '@/types/gallery';

type FilterType = 'all' | 'portfolio' | 'visits';

export default function GalleryPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch gallery images
  const { data: images = [], isLoading } = useQuery({
    queryKey: ['gallery', filter],
    queryFn: () => {
      const filterParams =
        filter === 'portfolio'
          ? { isPortfolio: true }
          : filter === 'visits'
            ? { isPortfolio: false }
            : undefined;
      return galleryApi.getAll(filterParams);
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      galleryApi.upload(file, {
        description: uploadDescription || undefined,
        isPortfolio: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadDescription('');
      toast.success('Zdjęcie zostało dodane');
    },
    onError: () => {
      toast.error('Nie udało się dodać zdjęcia');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => galleryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      setSelectedImage(null);
      toast.success('Zdjęcie zostało usunięte');
    },
    onError: () => {
      toast.error('Nie udało się usunąć zdjęcia');
    },
  });

  // Generate caption mutation
  const captionMutation = useMutation({
    mutationFn: (imageId: string) => galleryApi.generateCaption(imageId),
    onSuccess: (caption) => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      if (selectedImage) {
        setSelectedImage({
          ...selectedImage,
          captions: [caption, ...(selectedImage.captions || [])],
        });
      }
      toast.success('Opis został wygenerowany');
    },
    onError: () => {
      toast.error('Nie udało się wygenerować opisu');
    },
  });

  // Dropzone for upload dialog
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleUpload = () => {
    if (uploadFile) {
      uploadMutation.mutate(uploadFile);
    }
  };

  const handleCopyCaption = async (caption: GeneratedCaption) => {
    try {
      await navigator.clipboard.writeText(caption.content);
      setCopiedId(caption.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Skopiowano do schowka');
    } catch {
      toast.error('Nie udało się skopiować');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <PageHeader
          icon={Images}
          title="Galeria"
          description="Zdjęcia z realizacji i portfolio"
        />
        <Button size="sm" onClick={() => setShowUploadDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Dodaj
        </Button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b space-y-3">
        <div className="flex gap-1">
          {(['all', 'portfolio', 'visits'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {f === 'all' && 'Wszystkie'}
              {f === 'portfolio' && 'Portfolio'}
              {f === 'visits' && 'Z wizyt'}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 flex-shrink-0" />
          Kliknij zdjęcie, aby wygenerować post na social media
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">Brak zdjęć</p>
            <p className="text-sm mt-1">Dodaj pierwsze zdjęcie do galerii</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setShowUploadDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Dodaj zdjęcie
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
            {images.map((image) => (
              <button
                key={image.id}
                onClick={() => setSelectedImage(image)}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted group focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <img
                  src={image.thumbnailUrl}
                  alt={image.description || 'Zdjęcie'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {image.visitId && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Wizyta
                  </div>
                )}
                {image.captions && image.captions.length > 0 && (
                  <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur text-xs px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3 inline mr-1 text-yellow-500" />
                    Ma opis
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj zdjęcie</DialogTitle>
            <DialogDescription>
              Przeciągnij zdjęcie lub kliknij aby wybrać
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!uploadFile ? (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50',
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive
                    ? 'Upuść zdjęcie tutaj...'
                    : 'Przeciągnij zdjęcie lub kliknij'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, WebP do 10MB
                </p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={URL.createObjectURL(uploadFile)}
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <button
                  onClick={() => setUploadFile(null)}
                  className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur rounded-full hover:bg-background"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Opis (opcjonalnie)</Label>
              <Input
                id="description"
                placeholder="np. Jesienny french w odcieniach cappuccino"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setUploadFile(null);
                setUploadDescription('');
              }}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Detail Sheet */}
      <Sheet
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <SheetContent side="bottom" className="max-h-[85vh] overflow-auto px-4 rounded-t-2xl">
          {selectedImage && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle>Szczegóły zdjęcia</SheetTitle>
              </SheetHeader>

              <div className="space-y-6 pb-4">
                {/* Image - social media style sizing */}
                <div className="flex justify-center">
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.description || 'Zdjęcie'}
                    className="w-full max-w-sm lg:max-w-md rounded-lg object-cover"
                    style={{ maxHeight: '500px' }}
                  />
                </div>

                {/* Info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatDate(selectedImage.createdAt)}</span>
                  {selectedImage.visit && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {selectedImage.visit.service?.name}
                    </span>
                  )}
                </div>

                {/* Description */}
                {selectedImage.description && (
                  <p className="text-sm">{selectedImage.description}</p>
                )}

                {/* Generate Caption Button */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Napisz post</h3>
                      <Button
                        size="sm"
                        onClick={() => captionMutation.mutate(selectedImage.id)}
                        disabled={captionMutation.isPending}
                      >
                        {captionMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-1" />
                        )}
                        Generuj
                      </Button>
                    </div>

                    {selectedImage.captions &&
                    selectedImage.captions.length > 0 ? (
                      <div className="space-y-3">
                        {selectedImage.captions.map((caption, index) => (
                          <div
                            key={caption.id}
                            className={cn(
                              'p-3 rounded-lg border',
                              index === 0
                                ? 'bg-primary/5 border-primary/20'
                                : 'bg-muted',
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {caption.content}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(caption.createdAt)}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyCaption(caption)}
                              >
                                {copiedId === caption.id ? (
                                  <Check className="w-4 h-4 mr-1 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4 mr-1" />
                                )}
                                {copiedId === caption.id
                                  ? 'Skopiowano'
                                  : 'Kopiuj'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Koly napisze dla Ciebie chwytliwy opis na social media
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Delete Button */}
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(selectedImage.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Usuń zdjęcie
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
