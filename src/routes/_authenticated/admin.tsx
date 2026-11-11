import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id).eq("role", "admin");
    if (!data?.length) throw redirect({ to: "/account" });
  },
  head: () => ({ meta: [{ title: "Painel administrativo" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard" },
] as const;

function AdminLayout() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-sidebar-border bg-sidebar md:min-h-screen md:w-56 md:border-b-0 md:border-r">
        <div className="p-4 font-display text-lg">Painel</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/admin" }}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-foreground" }}>
              {n.label}
            </Link>
          ))}
          <Link to="/" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted-foreground">Ver página ↗</Link>
        </nav>
      </aside>
      <main className="flex-1 p-5 md:p-8"><Outlet /></main>
    </div>
  );
}
