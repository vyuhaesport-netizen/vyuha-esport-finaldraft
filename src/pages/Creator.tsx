import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, 
  Users, 
  Search,
  Loader2,
  Calendar,
  IndianRupee,
  Gamepad2
} from 'lucide-react';
import { format } from 'date-fns';

interface Tournament {
  id: string;
  title: string;
  game: string;
  description: string | null;
  prize_pool: string | null;
  entry_fee: number | null;
  max_participants: number | null;
  start_date: string;
  status: string | null;
  tournament_type: string;
}

const Creator = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [registering, setRegistering] = useState<string | null>(null);
  const [registeredTournaments, setRegisteredTournaments] = useState<string[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
    if (user) {
      fetchUserRegistrations();
    }
  }, [user]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('tournament_type', 'creator')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRegistrations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('tournament_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setRegisteredTournaments(data?.map(r => r.tournament_id) || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const handleRegister = async (tournamentId: string) => {
    if (!user) return;

    setRegistering(tournamentId);

    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Registered',
            description: 'You are already registered for this tournament.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Registered!',
          description: 'Successfully registered for the tournament.',
        });
        setRegisteredTournaments([...registeredTournaments, tournamentId]);
      }
    } catch (error) {
      console.error('Error registering:', error);
      toast({
        title: 'Failed',
        description: 'Could not register. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRegistering(null);
    }
  };

  const filteredTournaments = tournaments.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.game.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="Creator Tournaments">
      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creator tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-4 mb-4">
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Creator Tournaments</p>
          <p className="text-xs text-muted-foreground mt-1">Community-created matches for gamers by gamers</p>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No creator tournaments found</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later for new matches!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Tournament Header */}
                <div className="h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center relative">
                  <Gamepad2 className="h-10 w-10 text-purple-500/40" />
                  <Badge 
                    className={`absolute top-2 right-2 text-[10px] ${
                      tournament.status === 'upcoming' 
                        ? 'bg-purple-500/10 text-purple-600' 
                        : tournament.status === 'ongoing'
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tournament.status}
                  </Badge>
                  <Badge className="absolute top-2 left-2 text-[10px] bg-purple-500/10 text-purple-600">
                    Creator
                  </Badge>
                </div>

                {/* Tournament Details */}
                <div className="p-4">
                  <h3 className="font-semibold mb-1">{tournament.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{tournament.game}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-purple-500" />
                      {format(new Date(tournament.start_date), 'MMM dd, hh:mm a')}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Trophy className="h-3.5 w-3.5 text-purple-500" />
                      {tournament.prize_pool || 'TBD'}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <IndianRupee className="h-3.5 w-3.5 text-purple-500" />
                      {tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free'}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                      {tournament.max_participants} slots
                    </div>
                  </div>

                  {tournament.status === 'upcoming' && (
                    <Button
                      variant={registeredTournaments.includes(tournament.id) ? 'secondary' : 'gaming'}
                      className="w-full"
                      size="sm"
                      disabled={registering === tournament.id || registeredTournaments.includes(tournament.id)}
                      onClick={() => handleRegister(tournament.id)}
                    >
                      {registering === tournament.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : registeredTournaments.includes(tournament.id) ? (
                        'Registered ✓'
                      ) : (
                        'Join Now'
                      )}
                    </Button>
                  )}

                  {tournament.status === 'ongoing' && (
                    <Button variant="secondary" className="w-full" size="sm" disabled>
                      In Progress
                    </Button>
                  )}

                  {tournament.status === 'completed' && (
                    <Button variant="secondary" className="w-full" size="sm" disabled>
                      Completed
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Creator;