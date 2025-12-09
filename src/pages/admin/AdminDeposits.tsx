import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, 
  ArrowDownLeft
} from 'lucide-react';
import { format } from 'date-fns';

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
}

const AdminDeposits = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const { user, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('deposits:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('deposits:view')) {
      fetchDeposits();
    }
  }, [hasPermission]);

  const fetchDeposits = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('type', 'deposit')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredDeposits = () => {
    if (activeTab === 'all') return deposits;
    return deposits.filter(d => d.status === activeTab);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/10 text-green-600 text-[10px]">Success</Badge>;
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">Pending</Badge>;
      case 'failed': return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Deposits">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Deposit History">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Success</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
            <TabsTrigger value="failed" className="text-xs">Failed</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Deposits List */}
        <div className="space-y-3">
          {getFilteredDeposits().map((deposit) => (
            <Card key={deposit.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <ArrowDownLeft className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-600">+₹{deposit.amount}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(deposit.created_at), 'MMM dd, yyyy hh:mm a')}
                      </p>
                      {deposit.description && (
                        <p className="text-xs text-muted-foreground mt-1">{deposit.description}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(deposit.status)}
                </div>
              </CardContent>
            </Card>
          ))}

          {getFilteredDeposits().length === 0 && (
            <div className="text-center py-12">
              <ArrowDownLeft className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No deposits found</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDeposits;
