import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { ReactNode, useEffect } from "react";

export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  children,
  variant = "primary",
  className,
  type = "button",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit" | "reset";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants: Record<string, string> = {
    primary: "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
  };
  return (
    <button className={cn(base, variants[variant], className)} type={type} {...props}>
      {children}
    </button>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-100 bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "success" | "warning" | "info" }) {
  const variants: Record<string, string> = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-sky-100 text-sky-700",
  };
  return <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", variants[variant])}>{children}</span>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <table className="w-full text-left text-sm text-slate-600">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">{children}</thead>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-slate-100 last:border-0">{children}</tr>;
}

export function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3", className)}>{children}</td>;
}

export function TableHeaderCell({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3">{children}</th>;
}

export function TabsRoot({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (value: string) => void }) {
  return <Tabs.Root value={value} onValueChange={onValueChange}>{children}</Tabs.Root>;
}

export function TabsList({ children }: { children: ReactNode }) {
  return <Tabs.List className="inline-flex rounded-full bg-slate-100 p-1">{children}</Tabs.List>;
}

export function TabsTrigger({ children, value }: { children: ReactNode; value: string }) {
  return (
    <Tabs.Trigger
      value={value}
      className="rounded-full px-4 py-2 text-xs font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900"
    >
      {children}
    </Tabs.Trigger>
  );
}

export function TabsContent({ children, value }: { children: ReactNode; value: string }) {
  return <Tabs.Content value={value} className="mt-4">{children}</Tabs.Content>;
}

export function DialogRoot({ children, open, onOpenChange }: { children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>{children}</Dialog.Root>;
}

export function DialogTrigger({ children }: { children: ReactNode }) {
  return <Dialog.Trigger asChild>{children}</Dialog.Trigger>;
}

export function DialogContent({ children }: { children: ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-slate-900/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <Dialog.Title className="text-lg font-semibold text-slate-900">{children}</Dialog.Title>;
}

export function DialogClose({ children }: { children: ReactNode }) {
  return <Dialog.Close asChild>{children}</Dialog.Close>;
}
