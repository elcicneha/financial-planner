import { useMemo, useState, useCallback } from 'react';
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
import { formatCurrency } from '@/lib/currency';
import type { FIFOGainRow } from '@/hooks/useCapitalGains';

interface CapitalGainsTableProps {
  gains: FIFOGainRow[];
  refetch?: () => void;
}

type SortKey = keyof FIFOGainRow;
type SortDirection = 'asc' | 'desc';

function formatNumber(value: number, decimals: number = 3): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function CapitalGainsTable({ gains, refetch }: CapitalGainsTableProps) {
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('sell_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey]);

  const getSortProps = useCallback(
    (key: SortKey) => ({
      sortable: true as const,
      sorted: sortKey === key ? sortDirection : (false as const),
      onSort: () => handleSort(key),
    }),
    [sortKey, sortDirection, handleSort]
  );

  const sortedGains = useMemo(() => {
    return [...gains].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [gains, sortKey, sortDirection]);

  const pendingCount = Object.keys(pendingChanges).length;

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    setPendingChanges({});
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setPendingChanges({});
  };

  const handleFundTypeChange = (ticker: string, fundType: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      [ticker]: fundType,
    }));
  };

  const handleSaveChanges = async () => {
    if (pendingCount === 0) {
      setIsEditMode(false);
      return;
    }

    setIsSaving(true);

    try {
      // Send all changes to backend
      const promises = Object.entries(pendingChanges).map(([ticker, fundType]) =>
        fetch('/api/fund-type-override', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, fund_type: fundType }),
        })
      );

      const results = await Promise.all(promises);

      // Check if any failed
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        const errorData = await failed[0].json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || 'Failed to update fund types');
      }

      // Success - refetch data and exit edit mode
      if (refetch) {
        refetch();
      }
      setIsEditMode(false);
      setPendingChanges({});

      toast({
        title: 'Fund types updated',
        description: `Successfully updated ${pendingCount} fund type${pendingCount !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error('Error updating fund types:', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
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
          {isEditMode && pendingCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isEditMode ? (
            <Button variant="outline" size="sm" onClick={handleEnterEditMode}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={isSaving || pendingCount === 0}
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
            Capital Gains - {sortedGains.length} transaction
            {sortedGains.length !== 1 ? 's' : ''}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead {...getSortProps('sell_date')}>Sell Date</TableHead>
              <TableHead {...getSortProps('ticker')}>Ticker</TableHead>
              <TableHead {...getSortProps('folio')}>Folio</TableHead>
              <TableHead className="text-right" {...getSortProps('units')}>Units</TableHead>
              <TableHead className="text-right" {...getSortProps('sell_nav')}>Sell NAV</TableHead>
              <TableHead className="text-right" {...getSortProps('sale_consideration')}>Sale Consideration</TableHead>
              <TableHead {...getSortProps('buy_date')}>Buy Date</TableHead>
              <TableHead className="text-right" {...getSortProps('buy_nav')}>Buy NAV</TableHead>
              <TableHead className="text-right" {...getSortProps('acquisition_cost')}>Acquisition Cost</TableHead>
              <TableHead className="text-right" {...getSortProps('gain')}>Gain/Loss</TableHead>
              <TableHead className="text-right" {...getSortProps('holding_days')}>Days Held</TableHead>
              <TableHead {...getSortProps('fund_type')}>Fund Type</TableHead>
              <TableHead {...getSortProps('term')}>Term</TableHead>
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
                  {formatCurrency(gain.sale_consideration)}
                </TableCell>
                <TableCell className="font-mono text-sm">{gain.buy_date}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatNumber(gain.buy_nav, 4)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(gain.acquisition_cost)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-sm font-medium ${
                    gain.gain >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(gain.gain)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{gain.holding_days}</TableCell>
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
                            : pendingChanges[gain.ticker]
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
