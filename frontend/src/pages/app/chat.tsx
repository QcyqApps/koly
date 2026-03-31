import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { chatApi } from '@/api/chat';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Send, Sparkles, Loader2, User, TrendingUp, UserX, Trophy, Lightbulb, History, MessageSquare, Plus } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';
import { formatLongDate } from '@/lib/format';

// Main daily questions - what users really want to know
const dailyQuestions = [
  {
    label: 'Ile dzis zarobilam?',
    prompt: 'Ile dzis zarobilam? Pokaz podsumowanie dzisiejszego dnia.',
    icon: TrendingUp,
  },
  {
    label: 'Ile kosztuja mnie no-show?',
    prompt: 'Ile kosztuja mnie nieodwolane wizyty? Pokaz kwote strat z no-show.',
    icon: UserX,
  },
  {
    label: 'Ktora usluga zarabia najlepiej?',
    prompt: 'Ktora usluga zarabia najlepiej? Pokaz ranking uslug wedlug zysku.',
    icon: Trophy,
  },
];

// Discovery section - educate users about AI capabilities
const discoverActions = [
  { label: 'Symuluj podwyzke cen', prompt: 'Symuluj podwyzke cen o 10% - jak wplynie to na moj zysk?' },
  { label: 'Czy stac mnie na pracownice?', prompt: 'Czy stac mnie na zatrudnienie pracownicy? Przeanalizuj moje finanse.' },
  { label: 'Napisz post na Instagram', prompt: 'Napisz post na Instagram promujacy moje uslugi.' },
  { label: 'Porownaj z poprzednim miesiacem', prompt: 'Porownaj ten miesiac z poprzednim - jak idzie biznes?' },
  { label: 'Jak zmniejszyc no-show?', prompt: 'Jak moge zmniejszyc liczbe nieodwolanych wizyt?' },
  { label: 'Pomoz wycenic nowa usluge', prompt: 'Pomoz mi wycenic nowa usluge - jakie czynniki powinienem uwzglednic?' },
  { label: 'Co jest modne w branzy?', prompt: 'Co jest teraz modne w mojej branzy? Jakie trendy warto znac?' },
  { label: 'Napisz wiadomosc do klientki', prompt: 'Napisz profesjonalna wiadomosc przypominajaca klientce o wizycie.' },
];

export function ChatPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch chat sessions
  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: chatApi.getSessions,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (msg: string) => chatApi.sendMessage(msg, sessionId || undefined),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, data.message]);
      refetchSessions();
    },
  });

  const loadSessionMutation = useMutation({
    mutationFn: (sid: string) => chatApi.getHistory(sid),
    onSuccess: (history, sid) => {
      setMessages(history);
      setSessionId(sid);
      setIsHistoryOpen(false);
    },
  });

  const handleSend = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;

    // Add user message locally first
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      userId: user?.id || '',
      sessionId: sessionId || '',
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    sendMessageMutation.mutate(message);
    setMessage('');
  };

  const handleQuickAction = (prompt: string) => {
    setMessage(prompt);
    // Auto-resize textarea after setting message
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }, 0);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setIsHistoryOpen(false);
  };

  const handleLoadSession = (sid: string) => {
    if (sid === sessionId) {
      setIsHistoryOpen(false);
      return;
    }
    loadSessionMutation.mutate(sid);
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Przed chwila';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    return formatLongDate(date);
  };

  const formatMessage = (content: string) => {
    // First escape HTML entities to prevent XSS
    const escapeHtml = (text: string) =>
      text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // Apply markdown-like formatting on escaped content
    const formatted = content
      .split('\n')
      .map((line) => {
        // Escape HTML first
        let safeLine = escapeHtml(line);
        // Bold text (on escaped content)
        safeLine = safeLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return `<div class="ml-2">${safeLine}</div>`;
        }
        return safeLine;
      })
      .join('<br />');

    // Final sanitization with DOMPurify
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['strong', 'br', 'div'],
      ALLOWED_ATTR: ['class'],
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-[18px] w-[18px] text-primary" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-foreground leading-tight">Koly</h1>
            <p className="text-xs text-muted-foreground">Twój asystent finansowy</p>
          </div>
        </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={handleNewChat} title="Nowa rozmowa">
                <Plus className="h-5 w-5" />
              </Button>
            )}
            <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <SheetTrigger
                render={<Button variant="ghost" size="icon" title="Historia rozmow" />}
              >
                <History className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Historia rozmow</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleNewChat}
                  >
                    <Plus className="h-4 w-4" />
                    Nowa rozmowa
                  </Button>

                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Brak historii rozmow</p>
                    </div>
                  ) : (
                    <div className="space-y-1 mt-4">
                      {sessions.map((session) => (
                        <button
                          key={session.sessionId}
                          type="button"
                          onClick={() => handleLoadSession(session.sessionId)}
                          disabled={loadSessionMutation.isPending}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            session.sessionId === sessionId
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {session.preview}
                                {session.preview.length >= 50 && '...'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span>{formatRelativeDate(session.lastActivity)}</span>
                                <span>•</span>
                                <span>{session.messageCount} wiad.</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-6">
            {/* Welcome message */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm">
                      Czesc{user?.name ? `, ${user.name}` : ''}! Jestem Koly, Twój asystent finansowy.
                      Pomoge Ci zrozumiec ile zarabiasz i jak mozesz zarabiac wiecej.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily questions - main CTAs */}
            <div className="space-y-3">
              {dailyQuestions.map((question) => {
                const Icon = question.icon;
                return (
                  <Button
                    key={question.label}
                    variant="outline"
                    className="w-full h-auto py-4 px-4 flex items-center gap-3 justify-start text-left"
                    onClick={() => handleQuickAction(question.prompt)}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">{question.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Discover section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Zapytaj mnie o...
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {discoverActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleQuickAction(action.prompt)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-muted' : 'bg-primary/10'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <div
                      className="text-sm prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {sendMessageMutation.isPending && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Myślę...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Napisz wiadomość..."
            disabled={sendMessageMutation.isPending}
            rows={1}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
