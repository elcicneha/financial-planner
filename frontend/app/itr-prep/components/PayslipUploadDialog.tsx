'use client';

import { Button } from '@/components/ui/button';
import { UploadDialog } from '@/components/UploadDialog';

interface PayslipData {
  gross_pay: number | null;
  breakdown: {
    monthly: Record<string, number> | null;
    annual: Record<string, number> | null;
  } | null;
  pay_period: {
    month: number;
    year: number;
    period_key: string;
  } | null;
  company_name: string | null;
}

interface PayslipFileResult {
  filename: string;
  success: boolean;
  payslip?: PayslipData;
  error?: string;
}

interface PayslipUploadDialogProps {
  onUploadSuccess?: (payslips: PayslipFileResult[]) => void;
}

export function PayslipUploadDialog({ onUploadSuccess }: PayslipUploadDialogProps) {
  const handleSuccess = (responses: unknown[]) => {
    // Each response is a PayslipFileResult from the batch
    const results = responses as PayslipFileResult[];
    if (results.length > 0) {
      onUploadSuccess?.(results);
    }
  };

  return (
    <UploadDialog
      endpoint="/api/upload-payslips"
      accept=".pdf"
      multiple
      onSuccess={handleSuccess}
      formatSuccessMessage={(response) => {
        const result = response as PayslipFileResult;
        if (result?.payslip?.pay_period) {
          const { month, year } = result.payslip.pay_period;
          const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'short' });
          return `${monthName} ${year}`;
        }
        return 'Processed successfully';
      }}
    >
      <UploadDialog.Trigger asChild>
        <Button variant="default" size="default">
          Upload Payslips
        </Button>
      </UploadDialog.Trigger>

      <UploadDialog.Content>
        <UploadDialog.Header>
          <UploadDialog.Title>Upload Payslips</UploadDialog.Title>
          <UploadDialog.Description>
            Upload your monthly payslip PDFs. Salary details will be automatically extracted.
          </UploadDialog.Description>
        </UploadDialog.Header>

        <UploadDialog.Body placeholder="Drag and drop your payslip PDFs here" />
      </UploadDialog.Content>
    </UploadDialog>
  );
}
