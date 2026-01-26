'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/currency';
import { PayslipUploadDialog } from '../components/PayslipUploadDialog';

interface PayslipPayPeriod {
  month: number;
  year: number;
  period_key: string;
}

interface PayslipBreakdown {
  monthly: Record<string, number> | null;
  annual: Record<string, number> | null;
}

interface PayslipData {
  id?: string; // Optional ID for saved payslips
  filename: string;
  gross_pay: number | null;
  breakdown: PayslipBreakdown | null;
  pay_period: PayslipPayPeriod | null;
  company_name: string | null;
}

interface PayslipRecord {
  id: string;
  filename: string;
  upload_date: string;
  payslip_data: {
    gross_pay: number | null;
    breakdown: PayslipBreakdown | null;
    pay_period: PayslipPayPeriod | null;
    company_name: string | null;
  };
}

interface PayslipFileResult {
  filename: string;
  success: boolean;
  payslip?: {
    gross_pay: number | null;
    breakdown: PayslipBreakdown | null;
    pay_period: PayslipPayPeriod | null;
    company_name: string | null;
  };
  error?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatPayPeriod(period: PayslipPayPeriod | null): string {
  if (!period) return '-';
  const monthName = MONTH_NAMES[period.month - 1] || period.month;
  return `${monthName} ${period.year}`;
}

function formatComponentName(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get all unique breakdown keys from all payslips
function getAllBreakdownKeys(payslips: PayslipData[]): string[] {
  const keys = new Set<string>();
  for (const payslip of payslips) {
    if (payslip.breakdown?.monthly) {
      Object.keys(payslip.breakdown.monthly).forEach(k => keys.add(k));
    }
  }
  return Array.from(keys).sort();
}

export default function VariantOtherInfo() {
  const [payslips, setPayslips] = useState<PayslipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved payslips on mount
  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/payslips');
      if (response.ok) {
        const data: { payslips: PayslipRecord[] } = await response.json();

        // Transform PayslipRecord[] to PayslipData[]
        const transformedPayslips: PayslipData[] = data.payslips.map(record => ({
          id: record.id,
          filename: record.filename,
          gross_pay: record.payslip_data.gross_pay,
          breakdown: record.payslip_data.breakdown,
          pay_period: record.payslip_data.pay_period,
          company_name: record.payslip_data.company_name,
        }));

        setPayslips(transformedPayslips);
      }
    } catch (error) {
      console.error('Failed to fetch payslips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = async (results: PayslipFileResult[]) => {
    // After successful upload, refetch all payslips to get the latest data
    await fetchPayslips();
  };

  const handleRemovePayslip = async (payslip: PayslipData) => {
    if (!payslip.id) return;

    try {
      const response = await fetch(`/api/payslips/${payslip.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from UI
        setPayslips(prev => prev.filter(p => p.id !== payslip.id));
      } else {
        console.error('Failed to delete payslip');
      }
    } catch (error) {
      console.error('Failed to delete payslip:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await fetch('/api/payslips', {
        method: 'DELETE',
      });

      if (response.ok) {
        setPayslips([]);
      } else {
        console.error('Failed to clear payslips');
      }
    } catch (error) {
      console.error('Failed to clear payslips:', error);
    }
  };

  // Sort payslips by pay period
  const sortedPayslips = [...payslips].sort((a, b) => {
    if (!a.pay_period && !b.pay_period) return 0;
    if (!a.pay_period) return 1;
    if (!b.pay_period) return -1;
    const aKey = a.pay_period.period_key;
    const bKey = b.pay_period.period_key;
    return aKey.localeCompare(bKey);
  });

  // Get all breakdown columns
  const breakdownKeys = getAllBreakdownKeys(payslips);

  // Calculate totals
  const totalGrossPay = payslips.reduce((sum, p) => sum + (p.gross_pay || 0), 0);

  return (
    <div className="container mx-auto py-6 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Other Information</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload payslips and other documents for ITR preparation
        </p>
      </div>

      {/* Income Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Income</h2>
            <p className="text-sm text-muted-foreground">Upload your payslip PDFs</p>
          </div>
          <div className="flex items-center gap-2">
            {payslips.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            )}
            <PayslipUploadDialog onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {payslips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No payslips uploaded yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload your payslip PDFs to extract salary information
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Period</TableHead>
                      <TableHead className="text-right">Gross Pay</TableHead>
                      {breakdownKeys.map(key => (
                        <TableHead key={key} className="text-right">
                          {formatComponentName(key)}
                        </TableHead>
                      ))}
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPayslips.map((payslip, index) => (
                      <TableRow key={`${payslip.filename}-${index}`}>
                        <TableCell className="font-medium">
                          {formatPayPeriod(payslip.pay_period)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {payslip.gross_pay !== null
                            ? formatCurrency(payslip.gross_pay)
                            : '-'}
                        </TableCell>
                        {breakdownKeys.map(key => (
                          <TableCell key={key} className="text-right font-mono text-sm">
                            {payslip.breakdown?.monthly?.[key] !== undefined
                              ? formatCurrency(payslip.breakdown.monthly[key])
                              : '-'}
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button
                            size={"icon"}
                            variant={"destructiveGhost"}
                            onClick={() => handleRemovePayslip(payslip)}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    {payslips.length > 1 && (
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(totalGrossPay)}
                        </TableCell>
                        {breakdownKeys.map(key => {
                          const total = payslips.reduce(
                            (sum, p) => sum + (p.breakdown?.monthly?.[key] || 0),
                            0
                          );
                          return (
                            <TableCell key={key} className="text-right font-mono text-sm">
                              {total > 0 ? formatCurrency(total) : '-'}
                            </TableCell>
                          );
                        })}
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Interests Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Interests</h2>
            <p className="text-sm text-muted-foreground">Upload interest statements</p>
          </div>
          <Button variant="outline" disabled>
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                No interest documents uploaded yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Coming soon - upload bank statements and FD certificates
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
