import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, Loader2, MessageCircle, MoreVertical, 
  Pencil, Trash2, SmilePlus, X, Check, Reply, CornerDownRight
} from 'lucide-react';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reactions?: Record<string, string[]>;
  is_edited?: boolean;
  edited_at?: string;
  reply_to?: string | null;
  sender?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '😮'];
const GLOBAL_CHAT_CHANNEL = 'global_chat';

// Helper to safely parse reactions from database JSON
const parseReactions = (reactions: unknown): Record<string, string[]> => {
  if (!reactions || typeof reactions !== 'object') return {};
  return reactions as Record<string, string[]>;
};

const ChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcast = useRef<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();

  // Play notification sound
  const playMessageSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play message sound:', error);
    }
  };

  // Broadcast typing status
  const broadcastTyping = useCallback(async () => {
    if (!user) return;
    
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return;
    lastTypingBroadcast.current = now;

    const channel = supabase.channel(`typing_${GLOBAL_CHAT_CHANNEL}`);
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone',
        avatar: user.user_metadata?.avatar_url,
      },
    });
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      broadcastTyping();
    }
  };

  useEffect(() => {
    fetchMessages();
    
    const messageChannel = supabase
      .channel(`chat_${GLOBAL_CHAT_CHANNEL}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${GLOBAL_CHAT_CHANNEL}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('user_id', newMsg.sender_id)
              .single();
            
            const messageWithSender: ChatMessage = {
              ...newMsg,
              reactions: parseReactions(newMsg.reactions),
              sender: profile || undefined,
            };
            setMessages((prev) => [...prev, messageWithSender]);
            setTypingUsers((prev) => prev.filter((u) => u.id !== newMsg.sender_id));
            
            if (newMsg.sender_id !== user?.id) {
              playMessageSound();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as any;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMsg.id
                  ? { ...msg, ...updatedMsg, reactions: parseReactions(updatedMsg.reactions) }
                  : msg
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedMsg = payload.old as { id: string };
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedMsg.id));
          }
        }
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`typing_${GLOBAL_CHAT_CHANNEL}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === user?.id) return;
        
        setTypingUsers((prev) => {
          const exists = prev.find((u) => u.id === payload.userId);
          if (exists) return prev;
          return [...prev, { id: payload.userId, name: payload.name, avatar: payload.avatar }];
        });

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== payload.userId));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', GLOBAL_CHAT_CHANNEL)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((m) => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', senderIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, { username: p.username, full_name: p.full_name, avatar_url: p.avatar_url }])
        );

        const messagesWithSenders: ChatMessage[] = data.map((msg: any) => ({
          ...msg,
          reactions: parseReactions(msg.reactions),
          sender: profileMap.get(msg.sender_id),
        }));

        setMessages(messagesWithSenders);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setSending(true);
    try {
      const insertData: any = {
        group_id: GLOBAL_CHAT_CHANNEL,
        sender_id: user.id,
        content: newMessage.trim(),
        message_type: 'text',
      };
      
      if (replyingTo) {
        insertData.reply_to = replyingTo.id;
      }

      const { error } = await supabase.from('group_messages').insert(insertData);

      if (error) throw error;
      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const canModifyMessage = (msg: ChatMessage) => {
    if (msg.sender_id !== user?.id) return false;
    const minutesDiff = differenceInMinutes(new Date(), new Date(msg.created_at));
    return minutesDiff <= 5;
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('group_messages')
        .update({
          content: editContent.trim(),
        } as any)
        .eq('id', msgId)
        .eq('sender_id', user?.id);

      if (error) throw error;
      
      setEditingMessageId(null);
      setEditContent('');
      toast({ title: 'Message edited' });
    } catch (error) {
      console.error('Error editing message:', error);
      toast({ title: 'Error', description: 'Failed to edit message.', variant: 'destructive' });
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      const { error } = await supabase
        .from('group_messages')
        .delete()
        .eq('id', msgId)
        .eq('sender_id', user?.id);

      if (error) throw error;
      toast({ title: 'Message deleted' });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({ title: 'Error', description: 'Failed to delete message.', variant: 'destructive' });
    }
  };

  const handleReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';

    msgs.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const getReplyMessage = (replyToId: string | undefined | null) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId);
  };

  if (loading) {
    return (
      <AppLayout title="Chat">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <AppLayout title="Chat">
      <div className="flex flex-col h-[calc(100vh-120px)] bg-background">
        {/* Chat Header */}
        <div className="px-4 py-2.5 bg-card border-b border-border/60 flex items-center gap-2 shrink-0">
          <MessageCircle className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Global Chat</span>
          <span className="text-xs text-muted-foreground">({messages.length} messages)</span>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 min-h-0 px-3 py-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4 pb-32">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                      {getDateLabel(group.date)}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>
                  <div className="space-y-3">
                    {group.messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user?.id;
                    const canModify = canModifyMessage(msg);
                    const isEditing = editingMessageId === msg.id;
                    const repliedMessage = getReplyMessage(msg.reply_to);

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 group ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                      >
                        {!isOwnMessage && (
                          <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                            <AvatarImage src={msg.sender?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {msg.sender?.username?.charAt(0).toUpperCase() || 'P'}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {!isOwnMessage && (
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-medium text-foreground">
                                {msg.sender?.full_name || msg.sender?.username || 'Player'}
                              </span>
                            </div>
                          )}

                          {/* Reply Preview */}
                          {repliedMessage && (
                            <div className={`flex items-center gap-1.5 mb-1 text-xs text-muted-foreground ${isOwnMessage ? 'justify-end' : ''}`}>
                              <CornerDownRight className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">
                                {repliedMessage.sender?.full_name || repliedMessage.sender?.username}: {repliedMessage.content}
                              </span>
                            </div>
                          )}

                          <div className={`relative ${isOwnMessage ? 'flex flex-row-reverse items-start gap-1' : 'flex items-start gap-1'}`}>
                            {isEditing ? (
                              <div className="flex items-center gap-2 w-full">
                                <Input
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="flex-1 h-8 text-sm"
                                  autoFocus
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(msg.id)}>
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div
                                  className={`px-3 py-2 rounded-2xl text-sm break-words ${
                                    isOwnMessage
                                      ? 'bg-primary text-primary-foreground rounded-br-md'
                                      : 'bg-muted/80 text-foreground rounded-bl-md'
                                  }`}
                                >
                                  {msg.content}
                                </div>

                                {/* Message Actions */}
                                <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => handleReply(msg)}
                                  >
                                    <Reply className="h-3.5 w-3.5" />
                                  </Button>

                                  {canModify && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-6 w-6">
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align={isOwnMessage ? 'end' : 'start'}>
                                        <DropdownMenuItem onClick={() => handleStartEdit(msg)}>
                                          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteMessage(msg.id)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          <p className={`text-[10px] text-muted-foreground mt-0.5 ${isOwnMessage ? 'text-right' : ''}`}>
                            {formatMessageTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Fixed Composer */}
        <div className="fixed left-0 right-0 bottom-[72px] bg-card border-t border-border/60 px-3 py-2 z-40">
          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-1.5 mb-1.5 text-xs text-muted-foreground">
              <div className="flex -space-x-2">
                {typingUsers.slice(0, 3).map((u) => (
                  <Avatar key={u.id} className="h-5 w-5 border border-background">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className="text-[8px]">{u.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0].name} is typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          )}

          {/* Reply Preview */}
          {replyingTo && (
            <div className="flex items-center justify-between bg-muted/60 rounded-lg px-3 py-1.5 mb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                <Reply className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  Replying to {replyingTo.sender?.full_name || replyingTo.sender?.username}
                </span>
              </div>
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={cancelReply}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 h-10 bg-muted/50 border-border/60 rounded-full px-4"
              disabled={sending}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              disabled={sending || !newMessage.trim()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChatPage;
