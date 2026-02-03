import { memo } from "react";
import { Button } from "@/components/ui/button";
import { FORMULA_SYMBOLS } from "../../utils/constants";
import { cleanFormula } from "../../utils/formula";

interface FormulaBarProps {
  value: string;
  evaluatedValue?: number;
  error?: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
}

function FormulaBarInner({ value, evaluatedValue, error, inputRef, onChange }: FormulaBarProps) {
  const insertSymbol = (symbol: string) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newValue = value.substring(0, start) + symbol + value.substring(end);

    onChange(newValue);

    // Set cursor position after inserted symbol
    setTimeout(() => {
      input.focus();
      const newPosition = start + symbol.length;
      input.setSelectionRange(newPosition, newPosition);

      // Force scroll to cursor position
      input.scrollLeft = input.scrollWidth;
    }, 0);
  };

  const cleaned = cleanFormula(value);
  const hasResult = evaluatedValue !== undefined && !error && cleaned;

  return (
    <div className="sticky left-0 max-w-[calc(100cqw)] bg-background">
      {/* Formula preview with result */}
      <div className="px-3 py-2 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Formula:</span>
          <span className="font-mono text-sm font-medium">
            {cleaned || "(empty)"}
          </span>
          {hasResult && (
            <>
              <span className="text-muted-foreground">=</span>
              <span className="font-mono text-sm font-semibold text-primary">
                ₹{evaluatedValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </>
          )}
          {error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
        </div>
      </div>

      {/* Formula buttons */}
      <div className="flex gap-1 px-3 py-2 justify-center flex-wrap bg-background">
        <span className="text-xs text-muted-foreground self-center mr-2">
          Insert:
        </span>
        {FORMULA_SYMBOLS.map((symbol) => (
          <Button
            key={symbol}
            size="sm"
            variant="outline"
            className="h-9 w-10 font-mono font-bold"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertSymbol(symbol)}
            type="button"
          >
            {symbol}
          </Button>
        ))}
      </div>
    </div>
  );
}

export const FormulaBar = memo(FormulaBarInner);
