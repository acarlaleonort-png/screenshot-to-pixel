import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { onConsentChange, readChoice, saveChoices } from "@/lib/consent";

const Ctx = createContext<{ openSettings: () => void }>({ openSettings: () => {} });
export const useCookieSettings = () => useContext(Ctx);

/** LGPD cookie notice. Shown to every visitor until they answer. */
export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [gpc, setGpc] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const g = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
    setGpc(g);
    const sync = () => setAnalytics(readChoice("analytics") === "granted");
    sync();
    if (!g && readChoice("analytics") === null) setShow(true);
    return onConsentChange(sync);
  }, []);
  useEffect(() => { if (show) panel.current?.focus(); }, [show]);

  const all = (c: "granted" | "denied") => { saveChoices({ analytics: c }); setShow(false); setSettings(false); };
  const openSettings = () => { setAnalytics(readChoice("analytics") === "granted"); setSettings(true); };

  return (
    <Ctx.Provider value={{ openSettings }}>
      {children}
      {show && (
        <div ref={panel} tabIndex={-1} role="region" aria-label="Aviso de cookies"
          className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-3xl rounded-3xl border border-border bg-card/95 p-5 shadow-elegant outline-none backdrop-blur md:bottom-5">
          <p className="font-semibold">Sua privacidade importa</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Usamos armazenamento essencial para login, segurança e pagamento. Com sua permissão, também medimos visitas e
            etapas da compra para melhorar o site, conforme a Lei Geral de Proteção de Dados (LGPD). Saiba mais na{" "}
            <a href="/privacidade" className="underline">Política de Privacidade</a>.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="h-11 flex-1 rounded-2xl" onClick={() => all("granted")}>Aceitar todos</Button>
            <Button className="h-11 flex-1 rounded-2xl" onClick={() => all("denied")}>Rejeitar todos</Button>
            <Button variant="ghost" className="h-11 rounded-2xl" onClick={openSettings}>Configurar cookies</Button>
          </div>
        </div>
      )}
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar cookies</DialogTitle>
            <DialogDescription>Escolha o que podemos usar. Você pode mudar quando quiser pelo link no rodapé.</DialogDescription>
          </DialogHeader>
          {gpc && <p className="rounded-xl bg-muted p-3 text-sm">Seu navegador enviou um sinal de privacidade (Global Privacy Control), então a medição fica desativada.</p>}
          <div className="space-y-3">
            <div className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between"><span className="font-medium">Necessários</span><span className="text-xs text-muted-foreground">Sempre ativos</span></div>
              <p className="mt-1 text-sm text-muted-foreground">Login, segurança, pagamento, confirmação de idade e suas preferências de privacidade.</p>
            </div>
            <label className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4">
              <span>
                <span className="font-medium">Medição de uso</span>
                <span className="mt-1 block text-sm text-muted-foreground">Estatísticas de visitas e etapas da compra, fornecidas pelo próprio site e pela Lovable.</span>
              </span>
              <Switch checked={analytics && !gpc} disabled={gpc} onCheckedChange={setAnalytics} />
            </label>
          </div>
          <DialogFooter>
            <Button onClick={() => all(analytics && !gpc ? "granted" : "denied")}>Salvar preferências</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export function CookieSettingsLink({ className }: { className?: string }) {
  const { openSettings } = useCookieSettings();
  return <button type="button" onClick={openSettings} className={className ?? "underline"}>Configurar cookies</button>;
}
