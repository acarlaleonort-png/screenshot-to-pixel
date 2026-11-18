// Pure helpers shared by the landing page and the admin panel.
export const LINK_ICONS = [
  { id: "instagram", label: "Instagram" },
  { id: "telegram", label: "Telegram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "vip", label: "Grupo VIP" },
  { id: "free", label: "Grupo Free" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "X/Twitter" },
  { id: "link", label: "Link personalizado" },
] as const;

export function isValidLinkUrl(url: string): boolean {
  const v = url.trim();
  if (/^(mailto:|tel:)\S+$/i.test(v)) return true;
  try {
    const u = new URL(v);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Number shown publicly = admin display base + real events. Never mixes the two in storage. */
export function displayTotal(displayBase: number, realCount: number): number {
  return Math.max(0, Math.floor(displayBase)) + Math.max(0, Math.floor(realCount));
}

export function formatCounter(n: number, showPlus: boolean): string {
  return `${showPlus ? "+" : ""}${n.toLocaleString("pt-BR")}`;
}
