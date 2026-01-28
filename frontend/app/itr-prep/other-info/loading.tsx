import { Loader2 } from 'lucide-react';

export default function OtherInfoLoading() {
  return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
