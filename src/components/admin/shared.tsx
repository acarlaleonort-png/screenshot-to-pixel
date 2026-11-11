import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { STATUS_LABEL, type PaymentStatus } from "@/lib/format";

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const TONE: Record<PaymentStatus, string> = {
  APPROVED: "bg-primary/15 text-primary",
  PENDING: "bg-secondary text-secondary-foreground",
  DECLINED: "bg-destructive/15 text-destructive",
  CANCELED: "bg-muted text-muted-foreground",
  REFUNDED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export const METHOD_LABEL = { pix: "PIX", card: "Cartão", boleto: "Boleto" } as const;
