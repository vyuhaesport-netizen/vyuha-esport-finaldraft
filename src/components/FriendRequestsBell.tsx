import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface FriendRequest {
  id: string;
  requester_id: string;
  created_at: string;
  requester_profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

const FriendRequestsBell = () => {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('friends')
        .select('id, requester_id, created_at')
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch requester profiles
      if (data && data.length > 0) {
        const requesterIds = data.map(r => r.requester_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', requesterIds);

        const requestsWithProfiles = data.map(request => ({
          ...request,
          requester_profile: profiles?.find(p => p.user_id === request.requester_id) || null,
        }));

        setRequests(requestsWithProfiles);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();

      // Realtime subscription
      const channel = supabase
        .channel('friend-requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friends',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            fetchRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleAccept = async (requestId: string, requesterId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: 'Friend Added', description: 'You are now friends!' });
      fetchRequests();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to accept request.', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: 'Request Declined' });
      fetchRequests();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to decline request.', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const requestCount = requests.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
          <UserPlus className="h-5 w-5 text-foreground" />
          {requestCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {requestCount > 99 ? '99+' : requestCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-left">Friend Requests</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No friend requests</p>
              <p className="text-xs text-muted-foreground mt-1">When someone sends you a friend request, it will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {requests.map((request) => (
                <div key={request.id} className="p-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.requester_profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {request.requester_profile?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {request.requester_profile?.full_name || request.requester_profile?.username || 'Unknown User'}
                    </p>
                    {request.requester_profile?.username && (
                      <p className="text-xs text-muted-foreground truncate">@{request.requester_profile.username}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(request.id, request.requester_id)}
                      disabled={processingId === request.id}
                      className="h-8 px-3 text-xs"
                    >
                      {processingId === request.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Accept'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="h-8 px-3 text-xs"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default FriendRequestsBell;
