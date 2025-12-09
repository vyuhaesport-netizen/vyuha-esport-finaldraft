import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Wallet as WalletIcon, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  History,
  IndianRupee
} from 'lucide-react';

const Wallet = () => {
  const [balance] = useState(0);

  const transactions = [
    // Empty for now - placeholder
  ];

  return (
    <AppLayout title="Wallet">
      <div className="p-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-primary to-orange-400 rounded-xl p-6 text-primary-foreground mb-6">
          <div className="flex items-center gap-2 mb-2">
            <WalletIcon className="h-5 w-5" />
            <span className="text-sm opacity-90">Available Balance</span>
          </div>
          <div className="flex items-baseline gap-1">
            <IndianRupee className="h-6 w-6" />
            <span className="text-4xl font-gaming font-bold">{balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button variant="outline" className="h-14 flex-col gap-1">
            <Plus className="h-5 w-5 text-primary" />
            <span className="text-xs">Add Money</span>
          </Button>
          <Button variant="outline" className="h-14 flex-col gap-1">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            <span className="text-xs">Withdraw</span>
          </Button>
        </div>

        {/* Quick Add */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <h3 className="font-semibold text-sm mb-3">Quick Add</h3>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[50, 100, 200, 500].map((amount) => (
              <button
                key={amount}
                className="bg-muted rounded-lg py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors"
              >
                ₹{amount}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Enter amount" type="number" />
            <Button variant="gaming" size="sm">Add</Button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Transaction History</h3>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <ArrowDownLeft className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">No transactions yet</p>
              <p className="text-muted-foreground text-xs mt-1">Add money to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Transactions will go here */}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Wallet;
