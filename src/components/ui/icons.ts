/**
 * Icone dell'app — un solo punto di import.
 *
 * Sotto c'è Phosphor, esportato con i nomi Lucide come fa Telebi
 * (`src/components/ui/icons.ts`). Due motivi per tenere lo shim invece di
 * importare direttamente dalla libreria:
 *
 *  - il tratto resta quello di Telebi (Phosphor è più arrotondato di Lucide) e
 *    lo si cambia in un file solo se un giorno si cambia libreria;
 *  - i nomi Lucide sono quelli che ricordano tutti, e i frammenti di codice
 *    copiati dal design system continuano a funzionare senza riscritture.
 *
 * Il peso di default (`regular`, ~2px) è impostato via IconContext in main.tsx.
 * Se serve un look più leggero si cambia lì, non icona per icona.
 *
 * Regola: si aggiunge una riga qui, non un import da '@phosphor-icons/react'
 * dentro una pagina.
 */

import type { Icon as PhIcon, IconProps } from '@phosphor-icons/react';

/** Tipo di una icona, per le prop `icon: LucideIcon` dei componenti. */
export type LucideIcon = PhIcon;
export type { IconProps };

export {
  // ── Azioni ──────────────────────────────────────────────────────────────
  Plus,
  Minus,
  X,
  XCircle,
  Check,
  CheckCircle,
  Circle,
  Copy,
  FloppyDisk as Save,
  Pencil as Edit,
  Pencil,
  NotePencil,
  TrashSimple as Trash2,
  ArrowsClockwise as RefreshCw,
  DownloadSimple as Download,
  UploadSimple as Upload,
  Printer,
  PaperPlaneTilt as Send,
  Eye,
  DotsThree as MoreHorizontal,
  DotsThreeVertical as MoreVertical,

  // ── Ricerca e filtri ────────────────────────────────────────────────────
  MagnifyingGlass as Search,
  Funnel as Filter,
  SlidersHorizontal,

  // ── Navigazione ─────────────────────────────────────────────────────────
  CaretUp as ChevronUp,
  CaretDown as ChevronDown,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  CaretDoubleLeft as ChevronsLeft,
  CaretDoubleRight as ChevronsRight,
  ArrowLeft,
  ArrowRight,
  List,
  Table,
  SquaresFour as Grid,

  // ── Aree dell'app ───────────────────────────────────────────────────────
  House,
  Users,
  FileText,
  Tree,
  Receipt,
  Wallet,

  // ── Anagrafica ──────────────────────────────────────────────────────────
  User,
  UserCircle,
  Buildings,
  Bank,
  MapPin,
  Phone,
  EnvelopeSimple as Mail,
  Globe,
  Hash,

  // ── Dominio: alberi, mezzi, cantiere ────────────────────────────────────
  TreeEvergreen,
  Truck,
  GasPump,
  Wrench,
  Package,
  Lightning,
  Drop,
  Barbell,
  Signature,
  ClipboardText,

  // ── Tempo ───────────────────────────────────────────────────────────────
  Calendar,
  CalendarBlank,
  CalendarCheck,
  Clock,

  // ── Stato e segnalazioni ────────────────────────────────────────────────
  Warning as AlertTriangle,
  WarningCircle as AlertCircle,
  Info,
  ChartBar,
  Percent,

  // ── Media ───────────────────────────────────────────────────────────────
  Camera,
  Image as ImageIcon,
  ImageSquare,

  // ── Sistema ─────────────────────────────────────────────────────────────
  Gear as Settings,
  SignOut as LogOut,
  Chats,
} from '@phosphor-icons/react';
