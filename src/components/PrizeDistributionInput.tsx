import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Trophy } from 'lucide-react';

interface PrizeDistributionInputProps {
  value: string;
  onChange: (value: string) => void;
  prizePool: number;
}

interface PrizeEntry {
  position: number;
  percentage: number;
}

const PrizeDistributionInput = ({ value, onChange, prizePool }: PrizeDistributionInputProps) => {
  const [prizes, setPrizes] = useState<PrizeEntry[]>([
    { position: 1, percentage: 50 },
    { position: 2, percentage: 30 },
    { position: 3, percentage: 20 },
  ]);

  // Parse initial value
  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        const entries: PrizeEntry[] = Object.entries(parsed).map(([pos, pct]) => ({
          position: parseInt(pos),
          percentage: typeof pct === 'number' ? pct : parseFloat(pct as string) || 0,
        })).sort((a, b) => a.position - b.position);
        
        if (entries.length > 0) {
          setPrizes(entries);
        }
      } catch {
        // Keep default values if parsing fails
      }
    }
  }, []);

  // Update parent value when prizes change
  const updateValue = (newPrizes: PrizeEntry[]) => {
    setPrizes(newPrizes);
    const obj: Record<string, number> = {};
    newPrizes.forEach(p => {
      obj[p.position.toString()] = p.percentage;
    });
    onChange(JSON.stringify(obj));
  };

  const handlePercentageChange = (index: number, percentage: string) => {
    const newPrizes = [...prizes];
    newPrizes[index].percentage = parseFloat(percentage) || 0;
    updateValue(newPrizes);
  };

  const addPosition = () => {
    const nextPosition = prizes.length > 0 ? Math.max(...prizes.map(p => p.position)) + 1 : 1;
    updateValue([...prizes, { position: nextPosition, percentage: 0 }]);
  };

  const removePosition = (index: number) => {
    if (prizes.length <= 1) return;
    const newPrizes = prizes.filter((_, i) => i !== index);
    updateValue(newPrizes);
  };

  const totalPercentage = prizes.reduce((sum, p) => sum + p.percentage, 0);
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01;

  const getPositionLabel = (pos: number) => {
    if (pos === 1) return '1st';
    if (pos === 2) return '2nd';
    if (pos === 3) return '3rd';
    return `${pos}th`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Prize Distribution
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addPosition}>
          <Plus className="h-3 w-3 mr-1" /> Add Position
        </Button>
      </div>

      <div className="space-y-2">
        {prizes.map((prize, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-16 text-sm font-medium text-muted-foreground">
              {getPositionLabel(prize.position)}
            </div>
            <div className="flex-1 relative">
              <Input
                type="number"
                value={prize.percentage || ''}
                onChange={(e) => handlePercentageChange(index, e.target.value)}
                placeholder="0"
                className="pr-8"
                min="0"
                max="100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
            <div className="w-24 text-right text-sm font-medium text-green-600">
              ₹{Math.round((prizePool * prize.percentage) / 100).toLocaleString()}
            </div>
            {prizes.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePosition(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className={`flex items-center justify-between p-2 rounded-lg ${isValidTotal ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
        <span className="text-sm font-medium">Total</span>
        <span className={`text-sm font-bold ${isValidTotal ? 'text-green-600' : 'text-destructive'}`}>
          {totalPercentage.toFixed(0)}% {!isValidTotal && '(Must be 100%)'}
        </span>
      </div>
    </div>
  );
};

export default PrizeDistributionInput;
