import { memo } from "react";
import { Button } from "@/components/ui/button";
import { FORMULA_SYMBOLS } from "../../utils/constants";
import { cleanFormula } from "../../utils/formula";

interface FormulaBarProps {
  value: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
}

function FormulaBarInner({ value, inputRef, onChange }: FormulaBarProps) {
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

  return (
    <div className="sticky left-0 max-w-[calc(100cqw)] bg-background">
      {/* Formula preview */}
      <div className="px-3 py-2 bg-muted/30 border-b">
        <div className="text-xs text-muted-foreground mb-1">Current formula:</div>
        <div className="font-mono text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-thin">
          {cleanFormula(value) || "(empty)"}
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
