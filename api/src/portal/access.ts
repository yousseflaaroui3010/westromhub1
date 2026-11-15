// MIRROR of src/portfolio/access.ts (ROLE_PERMISSIONS). The API is a separate
// package; parity.test.ts fails the build if the two tables drift. This copy is
// the one that counts: the server decides what leaves Westrom.

export type Role = 'owner' | 'accountant' | 'prospect' | 'staff';
export type MemberRole = Exclude<Role, 'staff'>;

export type Permission =
  | 'homes:view' | 'tenancy:view' | 'tenancy:names' | 'money:view' | 'statements:download' | 'documents:view'
  | 'feed:view' | 'showings:view' | 'alerts:view' | 'market:view' | 'members:view' | 'members:manage' | 'portfolio:any';

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  owner: [
    'homes:view', 'tenancy:view', 'money:view', 'statements:download', 'documents:view',
    'feed:view', 'showings:view', 'alerts:view', 'market:view', 'members:view', 'members:manage',
  ],
  accountant: ['money:view', 'statements:download', 'documents:view', 'alerts:view'],
  prospect: ['homes:view', 'market:view', 'documents:view'],
  staff: [
    'homes:view', 'tenancy:view', 'tenancy:names', 'money:view', 'statements:download',
    'documents:view', 'feed:view', 'showings:view', 'alerts:view', 'market:view',
    'members:view', 'members:manage', 'portfolio:any',
  ],
};

export const MEMBER_ROLES: readonly MemberRole[] = ['owner', 'accountant', 'prospect'];

export function permissions(role: Role | null): ReadonlySet<Permission> {
  return new Set(role ? ROLE_PERMISSIONS[role] : []);
}

/** Owners see "Jordan P."; only roles with tenancy:names see the full name. */
export function tenantLabel(fullName: string, perms: ReadonlySet<Permission>): string {
  if (perms.has('tenancy:names')) return fullName;
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
}
