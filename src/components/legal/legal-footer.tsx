import { Link } from "@tanstack/react-router";
import { CookieSettingsLink } from "./cookie-banner";

export function LegalLinks() {
  return (
    <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
      <Link to="/privacidade" className="underline">Política de Privacidade</Link>
      <Link to="/termos" className="underline">Termos de Uso</Link>
      <CookieSettingsLink />
      <span>Conteúdo +18</span>
    </nav>
  );
}
