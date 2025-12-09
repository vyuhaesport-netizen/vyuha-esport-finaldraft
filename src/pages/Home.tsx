import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Trophy, 
  Users, 
  Gamepad2, 
  ChevronRight,
  Loader2,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';

interface Tournament {
  id: string;
  title: string;
  game: string;
  prize_pool: string | null;
  entry_fee: number | null;
  start_date: string;
  status: string | null;
  max_participants: number | null;
}

const HomePage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, title, game, prize_pool, entry_fee, start_date, status, max_participants')
        .eq('status', 'upcoming')
        .order('start_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const games = [
    { name: 'BGMI', color: 'bg-yellow-500/10 text-yellow-600' },
    { name: 'Free Fire', color: 'bg-orange-500/10 text-orange-600' },
    { name: 'COD Mobile', color: 'bg-green-500/10 text-green-600' },
    { name: 'Valorant', color: 'bg-red-500/10 text-red-600' },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={vyuhaLogo} alt="Vyuha" className="h-10 w-10" />
          <div>
            <h1 className="font-gaming text-lg font-bold">Vyuha Esport</h1>
            <p className="text-xs text-muted-foreground">Welcome, {user?.email?.split('@')[0]}</p>
          </div>
        </div>
        <button className="relative p-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>
      </div>

      {/* Banner */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-primary to-orange-400 rounded-xl p-4 text-primary-foreground">
          <h2 className="font-gaming text-lg font-bold mb-1">Join Tournaments</h2>
          <p className="text-sm opacity-90 mb-3">Win amazing prizes and become a champion!</p>
          <Button 
            size="sm" 
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            onClick={() => navigate('/creator')}
          >
            Browse Now
          </Button>
        </div>
      </div>

      {/* Games Section */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-gaming font-semibold">Popular Games</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {games.map((game) => (
            <div
              key={game.name}
              className="flex-shrink-0 bg-card rounded-xl p-4 border border-border min-w-[100px] text-center"
            >
              <div className={`w-12 h-12 rounded-full ${game.color} flex items-center justify-center mx-auto mb-2`}>
                <Gamepad2 className="h-6 w-6" />
              </div>
              <p className="text-xs font-medium">{game.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Tournaments */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-gaming font-semibold">Upcoming Matches</h2>
          <button 
            className="text-primary text-sm flex items-center"
            onClick={() => navigate('/creator')}
          >
            View All <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">No upcoming tournaments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-card rounded-xl border border-border p-4"
                onClick={() => navigate('/creator')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm line-clamp-1">{tournament.title}</h3>
                    <p className="text-xs text-muted-foreground">{tournament.game}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary text-[10px]">
                    {tournament.status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-primary" />
                      {tournament.prize_pool || 'TBD'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {tournament.max_participants}
                    </span>
                  </div>
                  <span>{format(new Date(tournament.start_date), 'MMM dd, hh:mm a')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default HomePage;
