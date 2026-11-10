import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const safe = (r: unknown) => (typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : "/account");

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  head: () => ({
    meta: [
      { title: "Entrar — Acesso exclusivo" },
      { name: "description", content: "Entre ou crie sua conta para acessar seus conteúdos." },
      { property: "og:title", content: "Entrar" },
      { property: "og:description", content: "Entre ou crie sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const target = safe(redirect);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error("E-mail ou senha inválidos.");
      navigate({ href: target, replace: true });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + target, data: { full_name: name } },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      setSent(true);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7">
        {sent ? (
          <div className="text-center">
            <h1 className="text-2xl">Confira seu e-mail</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enviamos um link para confirmar sua conta. Depois é só entrar.</p>
            <Button variant="secondary" className="mt-6 w-full" onClick={() => { setSent(false); setMode("in"); }}>
              Voltar para entrar
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h1 className="text-2xl">{mode === "in" ? "Entrar" : "Criar conta"}</h1>
            {mode === "up" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Senha</Label>
              <Input id="pw" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
            </div>
            <Button type="submit" disabled={busy} className="h-12 w-full">
              {busy ? "Aguarde..." : mode === "in" ? "Entrar" : "Criar conta"}
            </Button>
            <button type="button" className="w-full text-center text-sm text-muted-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
