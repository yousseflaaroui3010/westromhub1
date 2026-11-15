import { describe, expect, it } from 'vitest';
import { can, permissionsFor, roleIn, tenantLabel, visiblePortfolios, type Membership, type Session } from './access';

const members: Membership[] = [
  { portfolioId: 'A', email: 'andrew@example.com', role: 'owner' },
  { portfolioId: 'A', email: 'Lisa@Example.com', role: 'owner' },
  { portfolioId: 'A', email: 'cpa@example.com', role: 'accountant' },
  { portfolioId: 'B', email: 'carlos@example.com', role: 'owner' },
  { portfolioId: 'B', email: 'cpa@example.com', role: 'owner' },
  { portfolioId: 'L', email: 'lead@example.com', role: 'prospect' },
];
const s = (email: string, staff = false): Session => ({ email, name: email, staff });
const ALL = ['A', 'B', 'L'];

describe('owner portfolio access', () => {
  it('lets both co-owners open the shared portfolio', () => {
    expect(roleIn(s('andrew@example.com'), 'A', members)).toBe('owner');
    expect(roleIn(s('lisa@example.com'), 'A', members)).toBe('owner'); // email case does not matter
  });

  it('never lets an owner open someone else’s portfolio', () => {
    expect(roleIn(s('andrew@example.com'), 'B', members)).toBeNull();
    expect(can(s('andrew@example.com'), 'B', 'homes:view', members)).toBe(false);
    expect(visiblePortfolios(s('andrew@example.com'), members, ALL)).toEqual(['A']);
  });

  it('gives an accountant the money and paperwork but nothing about tenants', () => {
    const p = permissionsFor(s('cpa@example.com'), 'A', members);
    expect(p.has('money:view')).toBe(true);
    expect(p.has('statements:download')).toBe(true);
    expect(p.has('tenancy:view')).toBe(false);
    expect(p.has('feed:view')).toBe(false);
    expect(p.has('members:manage')).toBe(false);
  });

  it('scopes roles per portfolio: the same person can be accountant on one and owner on another', () => {
    expect(roleIn(s('cpa@example.com'), 'A', members)).toBe('accountant');
    expect(roleIn(s('cpa@example.com'), 'B', members)).toBe('owner');
    expect(can(s('cpa@example.com'), 'A', 'tenancy:view', members)).toBe(false);
    expect(can(s('cpa@example.com'), 'B', 'tenancy:view', members)).toBe(true);
  });

  it('shows a prospect no money', () => {
    expect(can(s('lead@example.com'), 'L', 'money:view', members)).toBe(false);
    expect(can(s('lead@example.com'), 'L', 'market:view', members)).toBe(true);
  });

  it('lets staff open everything, and nobody else open anything without a membership', () => {
    expect(visiblePortfolios(s('jon@westromgroup.com', true), members, ALL)).toEqual(ALL);
    expect(visiblePortfolios(s('stranger@example.com'), members, ALL)).toEqual([]);
    expect(visiblePortfolios(null, members, ALL)).toEqual([]);
    expect(can(s('stranger@example.com'), 'A', 'homes:view', members)).toBe(false);
  });

  it('shows tenants as first name and initial unless the role has full names', () => {
    const owner = permissionsFor(s('andrew@example.com'), 'A', members);
    const staff = permissionsFor(s('x@westromgroup.com', true), 'A', members);
    expect(tenantLabel('Jordan Alexander Price', owner)).toBe('Jordan P.');
    expect(tenantLabel('Jordan Alexander Price', staff)).toBe('Jordan Alexander Price');
    expect(tenantLabel('Cher', owner)).toBe('Cher');
  });
});
