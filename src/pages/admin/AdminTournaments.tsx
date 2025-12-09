import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Loader2, 
  Trophy,
  Edit2,
  Trash2,
  Gamepad2,
  Youtube,
  Users,
  Wallet
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
  end_date: string | null;
  registration_deadline: string | null;
  status: string | null;
  rules: string | null;
  image_url: string | null;
  tournament_type: string;
}

interface PrizePosition {
  rank: number;
  amount: string;
}

const AdminTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [prizePositions, setPrizePositions] = useState<PrizePosition[]>([
    { rank: 1, amount: '' },
    { rank: 2, amount: '' },
    { rank: 3, amount: '' },
  ]);
  const [formData, setFormData] = useState({
    title: '',
    game: 'BGMI',
    tournament_mode: 'Squad',
    description: '',
    prize_pool: '',
    entry_fee: '',
    max_participants: '100',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    status: 'upcoming',
    rules: '',
    commission: '20',
    youtube_link: '',
    youtube_type: 'live',
  });

  const { user, isAdmin, loading: authLoading, hasPermission } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('tournaments:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('tournaments:view')) {
      fetchTournaments();
    }
  }, [hasPermission]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      game: 'BGMI',
      tournament_mode: 'Squad',
      description: '',
      prize_pool: '',
      entry_fee: '',
      max_participants: '100',
      start_date: '',
      end_date: '',
      registration_deadline: '',
      status: 'upcoming',
      rules: '',
      commission: '20',
      youtube_link: '',
      youtube_type: 'live',
    });
    setPrizePositions([
      { rank: 1, amount: '' },
      { rank: 2, amount: '' },
      { rank: 3, amount: '' },
    ]);
    setEditingTournament(null);
  };

  const openEditDialog = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      title: tournament.title,
      game: tournament.game,
      tournament_mode: 'Squad',
      description: tournament.description || '',
      prize_pool: tournament.prize_pool || '',
      entry_fee: tournament.entry_fee?.toString() || '',
      max_participants: tournament.max_participants?.toString() || '100',
      start_date: tournament.start_date ? new Date(tournament.start_date).toISOString().slice(0, 16) : '',
      end_date: tournament.end_date ? new Date(tournament.end_date).toISOString().slice(0, 16) : '',
      registration_deadline: tournament.registration_deadline ? new Date(tournament.registration_deadline).toISOString().slice(0, 16) : '',
      status: tournament.status || 'upcoming',
      rules: tournament.rules || '',
      commission: '20',
      youtube_link: '',
      youtube_type: 'live',
    });
    setDialogOpen(true);
  };

  const addPrizePosition = () => {
    setPrizePositions(prev => [
      ...prev,
      { rank: prev.length + 1, amount: '' }
    ]);
  };

  const updatePrizePosition = (index: number, amount: string) => {
    setPrizePositions(prev => 
      prev.map((p, i) => i === index ? { ...p, amount } : p)
    );
  };

  const removePrizePosition = (index: number) => {
    if (prizePositions.length > 1) {
      setPrizePositions(prev => 
        prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, rank: i + 1 }))
      );
    }
  };

  const getTotalDistribution = () => {
    return prizePositions.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.game || !formData.start_date) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasPermission(editingTournament ? 'tournaments:edit' : 'tournaments:create')) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission for this action.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const tournamentData = {
        title: formData.title,
        game: formData.game,
        description: formData.description || null,
        prize_pool: formData.prize_pool || null,
        entry_fee: formData.entry_fee ? parseFloat(formData.entry_fee) : 0,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : 100,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        registration_deadline: formData.registration_deadline ? new Date(formData.registration_deadline).toISOString() : null,
        status: formData.status,
        rules: formData.rules || null,
        created_by: user?.id,
      };

      if (editingTournament) {
        const { error } = await supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('id', editingTournament.id);

        if (error) throw error;
        toast({ title: 'Updated!', description: 'Tournament updated successfully.' });
      } else {
        const { error } = await supabase
          .from('tournaments')
          .insert(tournamentData);

        if (error) throw error;
        toast({ title: 'Created!', description: 'Tournament created successfully.' });
      }

      setDialogOpen(false);
      resetForm();
      fetchTournaments();
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tournament.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!hasPermission('tournaments:delete')) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to delete tournaments.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Delete this tournament?')) return;

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Deleted', description: 'Tournament deleted successfully.' });
      fetchTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tournament.',
        variant: 'destructive',
      });
    }
  };

  const getFilteredTournaments = () => {
    return tournaments.filter(t => {
      if (activeTab === 'all') return true;
      return t.status === activeTab;
    });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-600';
      case 'ongoing': return 'bg-green-500/10 text-green-600';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted';
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Tournaments">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Tournament Management">
      <div className="p-4 space-y-4">
        {/* Create Button */}
        {hasPermission('tournaments:create') && (
          <Button 
            variant="gaming" 
            className="w-full"
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Tournament
          </Button>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
            <TabsTrigger value="ongoing" className="text-xs">Live</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Done</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tournament List */}
        <div className="space-y-3">
          {getFilteredTournaments().map((tournament) => (
            <Card key={tournament.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Gamepad2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold line-clamp-1">{tournament.title}</h3>
                        <p className="text-xs text-muted-foreground">{tournament.game}</p>
                      </div>
                      <Badge className={`text-[10px] ${getStatusColor(tournament.status)}`}>
                        {tournament.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {tournament.prize_pool || '₹0'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        ₹{tournament.entry_fee || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tournament.max_participants || 100}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(tournament.start_date), 'MMM dd, yyyy hh:mm a')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t">
                  {hasPermission('tournaments:edit') && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(tournament)}>
                      <Edit2 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                  {hasPermission('tournaments:delete') && (
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(tournament.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {getFilteredTournaments().length === 0 && (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No tournaments found</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-gaming">
              {editingTournament ? 'Edit Tournament' : 'Create Tournament'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Tournament Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter tournament title"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Game *</Label>
                  <Select
                    value={formData.game}
                    onValueChange={(value) => setFormData({ ...formData, game: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BGMI">BGMI</SelectItem>
                      <SelectItem value="Free Fire">Free Fire</SelectItem>
                      <SelectItem value="COD Mobile">COD Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={formData.tournament_mode}
                    onValueChange={(value) => setFormData({ ...formData, tournament_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solo">Solo</SelectItem>
                      <SelectItem value="Duo">Duo</SelectItem>
                      <SelectItem value="Squad">Squad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Financials
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Entry Fee (₹)</Label>
                  <Input
                    type="number"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prize Pool (₹)</Label>
                  <Input
                    value={formData.prize_pool}
                    onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                    placeholder="10,000"
                  />
                </div>
              </div>

              {/* Prize Distribution */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Prize Distribution</Label>
                  <Button variant="ghost" size="sm" onClick={addPrizePosition}>
                    <Plus className="h-3 w-3 mr-1" /> Add Position
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {prizePositions.map((pos, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-8 text-sm font-medium text-primary">#{pos.rank}</span>
                      <Input
                        type="number"
                        value={pos.amount}
                        onChange={(e) => updatePrizePosition(index, e.target.value)}
                        placeholder="Prize amount"
                        className="flex-1"
                      />
                      {prizePositions.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => removePrizePosition(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-xs pt-2 border-t">
                  <span className="text-muted-foreground">Total Distribution:</span>
                  <span className={`font-medium ${
                    getTotalDistribution() > parseFloat(formData.prize_pool?.replace(/,/g, '') || '0') 
                      ? 'text-destructive' 
                      : 'text-green-600'
                  }`}>
                    ₹{getTotalDistribution().toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Commission %</Label>
                <Input
                  type="number"
                  value={formData.commission}
                  onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                  placeholder="20"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Match Time *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Players</Label>
                  <Input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Streaming */}
            <div className="space-y-3 p-3 border rounded-lg">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                Streaming (Optional)
              </h4>

              <div className="space-y-2">
                <Label>YouTube Link</Label>
                <Input
                  value={formData.youtube_link}
                  onChange={(e) => setFormData({ ...formData, youtube_link: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label>YouTube Type</Label>
                <Select
                  value={formData.youtube_type}
                  onValueChange={(value) => setFormData({ ...formData, youtube_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live Stream</SelectItem>
                    <SelectItem value="video">Recorded Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tournament description..."
                rows={3}
              />
            </div>

            {/* Rules */}
            <div className="space-y-2">
              <Label>Rules</Label>
              <Textarea
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                placeholder="Tournament rules..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button variant="gaming" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingTournament ? 'Update Tournament' : 'Create Tournament')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTournaments;
