import { ReactNode } from "react";
import { cn } from "./primitives";

export function PageShell({
  children,
  title,
  subtitle,
  actions,
  className,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-6", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>}
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center">
      <div className="text-base font-semibold text-slate-800">{title}</div>
      {description && <div className="text-sm text-slate-500">{description}</div>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("h-4 w-full animate-pulse rounded-full bg-slate-200", className)} />;
}
