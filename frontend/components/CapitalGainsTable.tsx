import React, { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FIFOGainRow } from '@/hooks/useCapitalGains';

interface CapitalGainsTableProps {
  gains: FIFOGainRow[];
  refetch?: () => void;
}

export default function CapitalGainsTable({ gains, refetch }: CapitalGainsTableProps) {
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, string>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  const sortedGains = useMemo(() => {
    return [...gains].sort((a, b) => {
      // Sort by sell date descending (most recent first)
      return b.sell_date.localeCompare(a.sell_date);
    });
  }, [gains]);

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (value: number, decimals: number = 3): string => {
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    setPendingChanges(new Map());
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setPendingChanges(new Map());
  };

  const handleFundTypeChange = (ticker: string, fundType: string) => {
    const newChanges = new Map(pendingChanges);
    newChanges.set(ticker, fundType);
    setPendingChanges(newChanges);
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) {
      setIsEditMode(false);
      return;
    }

    setIsSaving(true);

    try {
      // Send all changes to backend
      const promises = Array.from(pendingChanges.entries()).map(([ticker, fundType]) => {
        const params = new URLSearchParams({ ticker, fund_type: fundType });
        return fetch(`/api/fund-type-override?${params}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const results = await Promise.all(promises);

      // Check if any failed
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        const errorData = await failed[0].json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || 'Failed to update fund types');
      }

      // Success - refetch data and exit edit mode
      if (refetch) {
        refetch();
      }
      setIsEditMode(false);
      setPendingChanges(new Map());

      toast({
        title: "Fund types updated",
        description: `Successfully updated ${pendingChanges.size} fund type${pendingChanges.size !== 1 ? 's' : ''}`,
      });

    } catch (error) {
      console.error('Error updating fund types:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (gains.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No capital gains data available. Upload transaction PDFs to see results.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Edit Mode Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isEditMode && pendingChanges.size > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {pendingChanges.size} change{pendingChanges.size !== 1 ? 's' : ''} pending
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isEditMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnterEditMode}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={isSaving || pendingChanges.size === 0}
              >
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableCaption>
            FIFO Capital Gains - {sortedGains.length} transaction{sortedGains.length !== 1 ? 's' : ''}
          </TableCaption>
          <TableHeader>
          <TableRow>
            <TableHead>Sell Date</TableHead>
            <TableHead>Ticker</TableHead>
            <TableHead>Folio</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="text-right">Sell NAV</TableHead>
            <TableHead className="text-right">Sale Consideration</TableHead>
            <TableHead>Buy Date</TableHead>
            <TableHead className="text-right">Buy NAV</TableHead>
            <TableHead className="text-right">Acquisition Cost</TableHead>
            <TableHead className="text-right">Gain/Loss</TableHead>
            <TableHead className="text-right">Days Held</TableHead>
            <TableHead>Fund Type</TableHead>
            <TableHead>Term</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedGains.map((gain, index) => (
            <TableRow key={index}>
              <TableCell className="font-mono text-sm">{gain.sell_date}</TableCell>
              <TableCell className="font-medium">{gain.ticker}</TableCell>
              <TableCell className="text-muted-foreground">{gain.folio}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatNumber(gain.units)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatNumber(gain.sell_nav, 4)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                ₹{formatCurrency(gain.sale_consideration)}
              </TableCell>
              <TableCell className="font-mono text-sm">{gain.buy_date}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatNumber(gain.buy_nav, 4)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                ₹{formatCurrency(gain.acquisition_cost)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-sm font-medium ${
                  gain.gain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                ₹{formatCurrency(gain.gain)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {gain.holding_days}
              </TableCell>
              <TableCell>
                {isEditMode ? (
                  <Select
                    defaultValue={gain.fund_type}
                    onValueChange={(value) => handleFundTypeChange(gain.ticker, value)}
                  >
                    <SelectTrigger
                      className={
                        gain.fund_type === 'unknown'
                          ? 'w-28 border-orange-500 border-2'
                          : pendingChanges.has(gain.ticker)
                          ? 'w-28 border-yellow-500'
                          : 'w-28'
                      }
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="debt">Debt</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant={
                      gain.fund_type === 'equity'
                        ? 'default'
                        : gain.fund_type === 'debt'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {gain.fund_type === 'equity'
                      ? 'Equity'
                      : gain.fund_type === 'debt'
                      ? 'Debt'
                      : 'Unknown'}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    gain.term === 'Long-term'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {gain.term}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
