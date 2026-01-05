import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, X, Send, MessageSquare, HelpCircle, Clock, CheckCircle2, AlertCircle, Bot, Loader2, Sparkles, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Ticket {
  id: string;
  topic: string;
  description: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type ViewType = 'main' | 'ticket' | 'history' | 'ai-chat';

const HelpSupport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [requestCallback, setRequestCallback] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, topic, description, status, admin_response, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const topics = [
    { value: 'payment', label: 'Payment Issue' },
    { value: 'tournament', label: 'Tournament Bug' },
    { value: 'account', label: 'Account Problem' },
    { value: 'organizer', label: 'Organizer Report' },
    { value: 'other', label: 'Other' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        if (file.size <= 10 * 1024 * 1024) {
          validFiles.push(file);
        } else {
          toast({
            title: 'File too large',
            description: `${file.name} exceeds 10MB limit`,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Only images and videos are allowed',
          variant: 'destructive',
        });
      }
    }

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to submit a support request',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!topic) {
      toast({
        title: 'Select a topic',
        description: 'Please select the topic of your issue',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Describe your issue',
        description: 'Please provide details about your problem',
        variant: 'destructive',
      });
      return;
    }

    if (requestCallback && !callbackPhone.trim()) {
      toast({
        title: 'Phone Required',
        description: 'Please enter your phone number for callback',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const attachmentUrls: string[] = [];
      for (const file of attachments) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(uploadData.path);

        attachmentUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          topic,
          description: `${description.trim()}${requestCallback && callbackPhone ? `\n\n📞 Callback Phone: ${callbackPhone}` : ''}`,
          request_callback: requestCallback,
          attachments: attachmentUrls,
        });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: requestCallback 
          ? `Our team will contact you soon on ${callbackPhone}.`
          : "We'll get back to you via email within 24 hours.",
      });

      setCurrentView('main');
      setTopic('');
      setDescription('');
      setAttachments([]);
      setRequestCallback(false);
      setCallbackPhone('');
      fetchTickets();
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit support request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // AI Chat functionality
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleAiChat = async () => {
    if (!chatInput.trim() || isAiTyping) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAiTyping(true);

    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: [...chatMessages, userMessage].map(m => ({ role: m.role, content: m.content })),
          type: 'support',
          userId: user?.id
        }
      });

      if (response.error) throw response.error;

      const aiResponse = response.data?.response || 'Sorry, I could not process your request. Please try again.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error: any) {
      console.error('AI chat error:', error);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again later.';
      if (error?.message?.includes('429') || error?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error?.message?.includes('limit')) {
        errorMessage = 'AI service is temporarily unavailable. Please raise a ticket instead.';
      } else if (error?.message?.includes('disabled')) {
        errorMessage = 'AI service is currently disabled. Please raise a ticket for support.';
      }
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
      toast({
        title: 'AI Error',
        description: 'Could not get response from AI assistant',
        variant: 'destructive',
      });
    } finally {
      setIsAiTyping(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-amber-500/10 text-amber-500';
      case 'in_progress': return 'bg-blue-500/10 text-blue-500';
      case 'resolved': return 'bg-green-500/10 text-green-500';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // AI Chat View
  if (currentView === 'ai-chat') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentView('main')}
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-primary to-purple-600 rounded-lg">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Vyuha AI</h1>
                <p className="text-[10px] text-muted-foreground">Powered by Groq</p>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {/* Welcome message */}
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Hi! I'm Vyuha AI 👋</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Ask me anything about tournaments, wallet, deposits, withdrawals, or how to use Vyuha Esports!
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['How to join a tournament?', 'Deposit not credited', 'Withdrawal process'].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setChatInput(q);
                      }}
                      className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card border border-border rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-medium text-primary">Vyuha AI</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isAiTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Vyuha AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAiChat()}
              placeholder="Ask me anything about Vyuha..."
              className="flex-1 bg-muted border-0"
              disabled={isAiTyping}
            />
            <Button
              onClick={handleAiChat}
              disabled={!chatInput.trim() || isAiTyping}
              size="icon"
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            AI can make mistakes. For account issues, please raise a ticket.
          </p>
        </div>
      </div>
    );
  }

  // Ticket Form View
  if (currentView === 'ticket') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentView('main')}
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">Raise a Ticket</h1>
          </div>
        </header>

        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <Label>Topic *</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {topics.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Describe your issue *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about your problem..."
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Include any relevant details like transaction IDs, usernames, or error messages
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Request Callback</Label>
                <p className="text-xs text-muted-foreground">We'll call you to resolve the issue</p>
              </div>
              <Switch checked={requestCallback} onCheckedChange={setRequestCallback} />
            </div>

            {requestCallback && (
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  type="tel"
                  value={callbackPhone}
                  onChange={(e) => setCallbackPhone(e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Attachments (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => removeAttachment(index)}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-primary cursor-pointer">
              <Paperclip className="h-4 w-4" />
              <span>Add screenshots or videos</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            <p className="text-xs text-muted-foreground">Max 10MB per file</p>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Ticket'
            )}
          </Button>
        </div>
      </div>
    );
  }

  // History View
  if (currentView === 'history') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentView('main')}
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">My Tickets</h1>
          </div>
        </header>

        <div className="p-4">
          {loadingTickets ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No tickets yet</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setCurrentView('ticket')}
              >
                Raise a Ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">{ticket.topic}</span>
                        <Badge variant="outline" className={getStatusColor(ticket.status)}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                    </div>
                  </div>
                  
                  {ticket.admin_response && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-primary mb-1 font-medium">Admin Response:</p>
                      <p className="text-sm text-foreground">{ticket.admin_response}</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main View - Two options: AI or Raise Ticket
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Help & Support</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Welcome Section */}
        <div className="text-center py-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
            <HelpCircle className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">How can we help you?</h2>
          <p className="text-sm text-muted-foreground">
            Choose an option below to get the help you need
          </p>
        </div>

        {/* Two Main Options */}
        <div className="grid gap-4">
          {/* AI Chat Option */}
          <button
            onClick={() => setCurrentView('ai-chat')}
            className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-purple-600/10 border border-primary/20 rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-br from-primary to-purple-600 rounded-xl">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Ask Vyuha AI</h3>
                  <p className="text-xs text-muted-foreground">Instant answers powered by AI</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Get instant help with common questions about tournaments, wallet, payments, and more. Available 24/7!
              </p>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Instant Response
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  24/7
                </Badge>
              </div>
            </div>
          </button>

          {/* Raise Ticket Option */}
          <button
            onClick={() => setCurrentView('ticket')}
            className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg hover:border-primary/50"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-muted/50 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-muted rounded-xl">
                  <Ticket className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Raise a Ticket</h3>
                  <p className="text-xs text-muted-foreground">Get help from our support team</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                For account-specific issues, payment problems, or complex queries that need human assistance.
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Human Support
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  24-48 hours
                </Badge>
              </div>
            </div>
          </button>
        </div>

        {/* View Ticket History */}
        {tickets.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setCurrentView('history')}
          >
            <Clock className="h-4 w-4 mr-2" />
            View My Tickets ({tickets.length})
          </Button>
        )}

        {/* Quick Info */}
        <div className="bg-muted/50 rounded-xl p-4">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            Quick Tips
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Try AI first for instant answers to common questions</li>
            <li>• Raise a ticket for account-specific issues</li>
            <li>• Include screenshots when reporting problems</li>
            <li>• Check your ticket history for updates</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
