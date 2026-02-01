import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Cell } from "./Cell";
import { ColumnConfig } from "../types";

interface ViewRowProps<T> {
  row: T;
  columns: ColumnConfig<T>[];
  onEdit?: () => void;
  onDelete?: () => void;
  customActions?: React.ReactNode;
}

function ViewRowInner<T>({
  row,
  columns,
  onEdit,
  onDelete,
  customActions,
}: ViewRowProps<T>) {
  return (
    <TableRow>
      {columns.map((column) => {
        const value = (row as any)[column.key];

        return (
          <Cell
            key={column.key}
            column={column}
            value={value}
            row={row}
            isEditing={false}
            onChange={() => { }}
          />
        );
      })}
      <TableCell className="p-2 flex gap-1">
        {customActions ? (
          customActions
        ) : (
          <>
            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </TableCell>
    </TableRow>
  );
}

export const ViewRow = memo(ViewRowInner) as typeof ViewRowInner;
