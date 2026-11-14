import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "age_confirmed_18";

/** Full-screen +18 confirmation shown on first visit; answer kept on this device. */
export function AgeGate() {
  const [open, setOpen] = useState(false);
  const [denied, setDenied] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try { if (localStorage.getItem(KEY) !== "yes") setOpen(true); } catch { setOpen(true); }
  }, []);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  const confirm = () => { try { localStorage.setItem(KEY, "yes"); } catch { /* ignore */ } setOpen(false); };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="age-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-5 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-elegant">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold font-display text-2xl text-primary-foreground">18+</span>
        {denied ? (
          <>
            <h2 id="age-title" className="mt-6 text-2xl">Acesso não permitido</h2>
            <p className="mt-3 text-sm text-muted-foreground">Este site é exclusivo para maiores de 18 anos. Feche esta página.</p>
            <Button variant="ghost" className="mt-6" onClick={() => setDenied(false)}>Voltar</Button>
          </>
        ) : (
          <>
            <h2 id="age-title" className="mt-6 text-2xl">Conteúdo para maiores de 18 anos</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Este site contém conteúdo destinado exclusivamente a adultos. Ao entrar, você declara ter 18 anos ou mais e
              concorda com os <a href="/termos" className="underline">Termos de Uso</a> e a{" "}
              <a href="/privacidade" className="underline">Política de Privacidade</a>.
            </p>
            <div className="mt-7 grid gap-3">
              <Button ref={ref} onClick={confirm} className="h-12 rounded-2xl bg-gradient-gold text-base font-semibold">Tenho 18 anos ou mais — Entrar</Button>
              <Button variant="outline" onClick={() => setDenied(true)} className="h-12 rounded-2xl">Sou menor de idade — Sair</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
