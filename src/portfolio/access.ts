// Who may see what on an owner portfolio page.
//
// Same shape as the staff dashboard's rbac.py (Westrom_Security_Deposit):
// a permission is `section:action`, a role is a starting set of permissions.
// The difference is the SCOPE: an owner's permissions only ever apply to the
// portfolios they are a member of. Staff are the only ones who see every
// portfolio. In the real app this runs on the server for every request; the
// browser never decides access, it only hides what the server would refuse.

export type Role = 'owner' | 'accountant' | 'prospect' | 'staff';

export type Permission =
  | 'homes:view'          // the homes, photos and facts
  | 'tenancy:view'        // lease dates, rent status, who lives there (as initials)
  | 'tenancy:names'       // tenants' full names
  | 'money:view'          // ledger, cash flow
  | 'statements:download' // monthly owner statements (PDF)
  | 'documents:view'      // agreements, addenda, inspections, 1099s
  | 'feed:view'           // weekly owner updates, work orders
  | 'showings:view'       // showings, applications, listing feedback
  | 'alerts:view'         // tax protest, insurance renewal, lease ends
  | 'market:view'         // rent vs market
  | 'members:view'        // who else can open this portfolio
  | 'members:manage'      // invite or remove a co-owner or accountant
  | 'portfolio:any';      // open any portfolio (staff only)

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  owner: [
    'homes:view', 'tenancy:view', 'money:view', 'statements:download', 'documents:view',
    'feed:view', 'showings:view', 'alerts:view', 'market:view', 'members:view', 'members:manage',
  ],
  // An owner's CPA or bookkeeper: the money and the paperwork, nothing about tenants.
  accountant: ['money:view', 'statements:download', 'documents:view', 'alerts:view'],
  // A lead before signing: their house, the market, sample documents.
  prospect: ['homes:view', 'market:view', 'documents:view'],
  staff: [
    'homes:view', 'tenancy:view', 'tenancy:names', 'money:view', 'statements:download',
    'documents:view', 'feed:view', 'showings:view', 'alerts:view', 'market:view',
    'members:view', 'members:manage', 'portfolio:any',
  ],
};

export const ROLE_LABEL: Readonly<Record<Role, string>> = {
  owner: 'Owner',
  accountant: 'Accountant',
  prospect: 'Prospective owner',
  staff: 'Westrom Group staff',
};

export interface Session {
  email: string;
  name: string;
  /** Set only from Westrom's own staff directory, never from anything an owner can edit. */
  staff?: boolean;
}

export interface Membership {
  portfolioId: string;
  email: string;
  role: Exclude<Role, 'staff'>;
}

const norm = (email: string) => email.trim().toLowerCase();

/** The session's role on one portfolio, or null when they have no business there. */
export function roleIn(session: Session | null, portfolioId: string, memberships: readonly Membership[]): Role | null {
  if (!session) return null;
  if (session.staff) return 'staff';
  const me = norm(session.email);
  const m = memberships.find((x) => x.portfolioId === portfolioId && norm(x.email) === me);
  return m ? m.role : null;
}

export function permissionsFor(session: Session | null, portfolioId: string, memberships: readonly Membership[]): ReadonlySet<Permission> {
  const role = roleIn(session, portfolioId, memberships);
  return new Set(role ? ROLE_PERMISSIONS[role] : []);
}

export function can(session: Session | null, portfolioId: string, permission: Permission, memberships: readonly Membership[]): boolean {
  return permissionsFor(session, portfolioId, memberships).has(permission);
}

/** Portfolios this session may open, in the order given. */
export function visiblePortfolios(session: Session | null, memberships: readonly Membership[], allIds: readonly string[]): string[] {
  if (!session) return [];
  if (session.staff) return [...allIds];
  return allIds.filter((id) => roleIn(session, id, memberships) !== null);
}

/** Field-level rule: owners see "Jordan P.", staff see the full name. */
export function tenantLabel(fullName: string, perms: ReadonlySet<Permission>): string {
  if (perms.has('tenancy:names')) return fullName;
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
}
