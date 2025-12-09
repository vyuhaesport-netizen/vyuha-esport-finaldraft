import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Trophy, 
  Wallet, 
  TrendingUp, 
  Loader2,
  CalendarDays,
  UserCheck
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface DashboardStats {
  totalUsers: number;
  activeToday: number;
  totalTournaments: number;
  totalRevenue: number;
  platformEarnings: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeToday: 0,
    totalTournaments: 0,
    totalRevenue: 0,
    platformEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { user, isAdmin, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isAdmin && !hasPermission('dashboard:view')) {
        navigate('/home');
      }
    }
  }, [user, isAdmin, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (isAdmin || hasPermission('dashboard:view')) {
      fetchStats();
    }
  }, [isAdmin, fromDate, toDate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total tournaments
      const { count: tournamentCount } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true });

      // Fetch tournament registrations for revenue calculation
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('entry_fee');

      const { count: registrationCount } = await supabase
        .from('tournament_registrations')
        .select('*', { count: 'exact', head: true });

      // Calculate estimated revenue (entry_fee * registrations)
      const avgEntryFee = tournaments?.reduce((sum, t) => sum + (t.entry_fee || 0), 0) / (tournaments?.length || 1);
      const totalRevenue = avgEntryFee * (registrationCount || 0);
      const platformEarnings = totalRevenue * 0.2; // 20% commission

      setStats({
        totalUsers: userCount || 0,
        activeToday: Math.floor((userCount || 0) * 0.3), // Placeholder
        totalTournaments: tournamentCount || 0,
        totalRevenue,
        platformEarnings,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="p-4 space-y-4">
        {/* Date Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button variant="gaming" size="sm" onClick={fetchStats}>
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-gaming font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-gaming font-bold">{stats.activeToday}</p>
                  <p className="text-xs text-muted-foreground">Active Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-gaming font-bold">{stats.totalTournaments}</p>
                  <p className="text-xs text-muted-foreground">Tournaments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-gaming font-bold">₹{stats.totalRevenue.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Earnings Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Platform Earnings (20%)</p>
                <p className="text-3xl font-gaming font-bold mt-1">
                  ₹{stats.platformEarnings.toFixed(0)}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin/users')}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Manage Users</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin/tournaments')}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-xs">Tournaments</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin/withdrawals')}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-xs">Withdrawals</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin/team')}
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-xs">Team</span>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
