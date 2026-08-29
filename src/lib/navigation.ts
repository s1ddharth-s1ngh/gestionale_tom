import { House, Users, FileText, Tree, Receipt, Wallet } from '@/components/ui/icons';
import type { LucideIcon } from '@/components/ui/icons';

/**
 * Le voci del menu — fonte UNICA. docs/CONVENTIONS.md §5.2.
 *
 * Una rotta nuova va aggiunta qui, o non compare nella sidebar. In Telebi la
 * stessa regola è più severa (una rotta non registrata rende 404, di
 * proposito); qui non c'è un gate di permessi, quindi la rotta funziona
 * comunque — ma resterebbe invisibile, che è peggio.
 *
 * L'ordine è quello del menu, e riflette il flusso del lavoro: si parte dal
 * cliente, si fa un preventivo, diventa una commessa, si fattura, si contano i
 * costi.
 */
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** La home resta accesa solo sul match esatto, non sulle sottopagine. */
  isHome?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', href: '/', icon: House, isHome: true },
  { id: 'clienti', label: 'Clienti', href: '/clienti', icon: Users },
  { id: 'preventivi', label: 'Preventivi', href: '/preventivi', icon: FileText },
  { id: 'commesse', label: 'Commesse', href: '/commesse', icon: Tree },
  { id: 'fatture', label: 'Fatture', href: '/fatture', icon: Receipt },
  { id: 'costi', label: 'Costi', href: '/costi', icon: Wallet },
];

/**
 * Voce attiva: la home per match esatto, le altre per prefisso — così
 * `/clienti/abc` tiene accesa «Clienti», ma `/clienti` non tiene accesa «Home».
 * Il `+ '/'` evita che `/costi` accenda anche una futura `/costi-extra`.
 */
export function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.isHome) return pathname === item.href || pathname === item.href + '/';
  return pathname === item.href || pathname.startsWith(item.href + '/');
}
