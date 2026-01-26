import { Droplet } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-center px-4">
      <div className="p-4 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 mb-4">
        <Droplet className="w-8 h-8 sm:w-10 sm:h-10 text-teal-500" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        {description}
      </p>
    </div>
  );
}
