import { describe, expect, it } from 'vitest';
import type { CrmBook, Customer } from '../../types/crm';
import { createCrmSample } from '../../data/crmSample';
import {
  addInteraction,
  createCustomer,
  crmOverview,
  customerRow,
  customerRows,
  customerToInput,
  emptyCustomerInput,
  filterCustomers,
  historyFor,
  initials,
  isValidEmail,
  isValidPhone,
  parseTags,
  recentActivity,
  updateCustomer,
  validateCustomer,
  type CustomerInput,
} from './crmLogic';

const TODAY = '2026-10-14';
const sample = createCrmSample(TODAY);

const person: Customer = {
  id: 'x1',
  name: 'Test Person',
  email: 'test@example.com',
  status: 'active',
  tags: [],
  addedOn: '2026-01-01',
  updatedOn: '2026-01-01',
};
const bookWith = (customers: Customer[], interactions: CrmBook['interactions'] = []): CrmBook => ({ today: TODAY, customers, interactions });
const input = (o: Partial<CustomerInput> = {}): CustomerInput => ({ ...emptyCustomerInput, name: 'Ravi Kumar', email: 'ravi@example.com', ...o });

describe('helpers', () => {
  it('makes initials from the first and last name', () => {
    expect(initials('Anjali Raman')).toBe('AR');
    expect(initials('  Lakshmi   Devi Narayanan ')).toBe('LN');
    expect(initials('Cher')).toBe('C');
    expect(initials('')).toBe('?');
  });

  it('normalises tags: trimmed, lower-case, no duplicates or blanks', () => {
    expect(parseTags(' Wholesale, corporate   Gifting,wholesale,, ')).toEqual(['wholesale', 'corporate gifting']);
    expect(parseTags('')).toEqual([]);
  });

  it('accepts ordinary email addresses and rejects malformed ones', () => {
    for (const ok of ['a@b.co', 'first.last+tag@example.co.in']) expect(isValidEmail(ok), ok).toBe(true);
    for (const bad of ['plainaddress', 'a@b', 'a b@c.com', '@example.com', 'a@@b.com']) expect(isValidEmail(bad), bad).toBe(false);
  });

  it('accepts phone numbers from any country, without assuming India', () => {
    for (const ok of ['+91 98450 12345', '044 2811 4400', '+44 20 7946 0321', '+1 (415) 555-0187', '+971 4 555 0142', '98450.12345'])
      expect(isValidPhone(ok), ok).toBe(true);
    for (const bad of ['12345', 'call me', '+91-98450-1234x', '1234567890123456', '9845+012345'])
      expect(isValidPhone(bad), bad).toBe(false);
  });
});

describe('customer rows and the overview', () => {
  const rows = customerRows(sample);
  const o = crmOverview(rows);

  it('counts every status, and the counts add up', () => {
    expect(o.total).toBe(sample.customers.length);
    expect(o.prospects + o.active + o.inactive).toBe(o.total);
  });

  it('flags prospects and active customers with no contact for more than 30 days', () => {
    const b = bookWith(
      [
        { ...person, id: 'a' },
        { ...person, id: 'b', status: 'prospect', addedOn: '2026-09-01' },
        { ...person, id: 'c', status: 'inactive' },
        { ...person, id: 'd' },
      ],
      [
        { id: 'n1', customerId: 'a', date: '2026-09-13', type: 'call', summary: 'x' }, // 31 days ago
        { id: 'n2', customerId: 'd', date: '2026-09-14', type: 'call', summary: 'x' }, // exactly 30 days ago
      ],
    );
    const flagged = customerRows(b).filter((r) => r.needsCatchUp).map((r) => r.customer.id).sort();
    expect(flagged).toEqual(['a', 'b']); // b was never contacted and was added 43 days ago; c is inactive; d is within 30 days
    expect(crmOverview(customerRows(b)).needsCatchUp).toBe(2);
  });

  it('lists the most recently active customers first', () => {
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.lastActivity >= rows[i]!.lastActivity).toBe(true);
  });

  it('uses the later of the last interaction and the last edit as "last updated"', () => {
    const b = bookWith([{ ...person, updatedOn: '2026-10-01' }], [{ id: 'n1', customerId: 'x1', date: '2026-10-10', type: 'email', summary: 'x' }]);
    expect(customerRow(b, b.customers[0]!)).toMatchObject({ lastContact: '2026-10-10', lastActivity: '2026-10-10', daysSinceContact: 4 });
  });

  it('shows history newest first, and recent activity across customers', () => {
    const history = historyFor(sample, 'c1');
    expect(history.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
    const recent = recentActivity(sample, 3);
    expect(recent).toHaveLength(3);
    for (let i = 1; i < recent.length; i++) expect(recent[i - 1]!.interaction.date >= recent[i]!.interaction.date).toBe(true);
  });
});

describe('search and filter', () => {
  const rows = customerRows(sample);
  const names = (q: string, s: Parameters<typeof filterCustomers>[2] = 'all') => filterCustomers(rows, q, s).map((r) => r.customer.name);

  it('searches name, company, email, city and tags, ignoring case', () => {
    expect(names('anjali')).toEqual(['Anjali Raman']);
    expect(names('NILGIRI')).toEqual(['Vikram Iyer']);
    expect(names('northwind.example')).toEqual(['Daniel Brooks']);
    expect(names('dubai')).toEqual(['Sara Haddad']);
    expect(names('export').length).toBe(3);
  });

  it('matches phone numbers by digits, whatever the spacing', () => {
    expect(names('9845012345')).toEqual(['Anjali Raman']);
    expect(names('+44 20 7946')).toEqual(['Daniel Brooks']);
  });

  it('filters by status and combines with search', () => {
    expect(filterCustomers(rows, '', 'prospect').every((r) => r.customer.status === 'prospect')).toBe(true);
    expect(names('export', 'inactive')).toEqual(['Emily Chen']);
    expect(names('zzz')).toEqual([]);
  });
});

describe('adding and editing customers', () => {
  it('requires a name and a way to reach them', () => {
    expect(validateCustomer(sample, input({ name: '  ' })).name).toBe('Enter the customer’s name.');
    expect(validateCustomer(sample, input({ email: '', phone: '' })).email).toBe('Add an email address or a phone number.');
    expect(validateCustomer(sample, input({ email: '', phone: '+44 20 7946 0000' }))).toEqual({});
  });

  it('checks email format and refuses a duplicate email', () => {
    expect(validateCustomer(sample, input({ email: 'ravi@' })).email).toMatch(/name@example.com/);
    expect(validateCustomer(sample, input({ email: 'ANJALI@brightline.example.com' })).email).toBe('Another customer already uses this email address.');
    // …but a customer may keep their own email when edited.
    const c1 = sample.customers.find((c) => c.id === 'c1')!;
    expect(validateCustomer(sample, customerToInput(c1), 'c1')).toEqual({});
  });

  it('checks phone, status, tags and lengths', () => {
    expect(validateCustomer(sample, input({ phone: 'abc' })).phone).toMatch(/digits/);
    expect(validateCustomer(sample, input({ status: 'vip' })).status).toBe('Choose a status.');
    expect(validateCustomer(sample, input({ tags: 'a,b,c,d,e,f,g,h,i' })).tags).toMatch(/up to 8/);
    expect(validateCustomer(sample, input({ name: 'x'.repeat(101) })).name).toMatch(/under 100/);
  });

  it('adds a tidy record without changing the original book', () => {
    const r = createCustomer(sample, input({ name: '  Ravi   Kumar ', email: 'RAVI@Example.com', company: ' ', tags: 'Retail, retail', status: 'prospect' }));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.customer).toEqual({
      id: 'c15',
      name: 'Ravi Kumar',
      email: 'ravi@example.com',
      status: 'prospect',
      tags: ['retail'],
      addedOn: TODAY,
      updatedOn: TODAY,
    });
    expect(r.book.customers).toHaveLength(sample.customers.length + 1);
    expect(sample.customers).toHaveLength(14);
  });

  it('edits a customer, keeping their id, added date and history', () => {
    const r = updateCustomer(sample, 'c3', { ...customerToInput(sample.customers.find((c) => c.id === 'c3')!), status: 'inactive', notes: 'Clinic closed.' });
    if (!r.ok) throw new Error('expected success');
    expect(r.customer).toMatchObject({ id: 'c3', status: 'inactive', notes: 'Clinic closed.', updatedOn: TODAY });
    expect(r.customer.addedOn).toBe(sample.customers.find((c) => c.id === 'c3')!.addedOn);
    expect(historyFor(r.book, 'c3')).toEqual(historyFor(sample, 'c3'));
    expect(updateCustomer(sample, 'missing', input()).ok).toBe(false);
  });
});

describe('logging interactions', () => {
  it('adds a dated, typed entry to the top of the history', () => {
    const r = addInteraction(sample, { customerId: 'c3', type: 'call', date: TODAY, summary: '  Booked a visit next week.  ' });
    if (!r.ok) throw new Error('expected success');
    expect(r.interaction).toMatchObject({ customerId: 'c3', type: 'call', date: TODAY, summary: 'Booked a visit next week.' });
    expect(historyFor(r.book, 'c3')[0]).toEqual(r.interaction);
    // Contact today clears the "no contact in 30+ days" flag.
    expect(customerRow(sample, sample.customers.find((c) => c.id === 'c3')!).needsCatchUp).toBe(true);
    expect(customerRow(r.book, r.book.customers.find((c) => c.id === 'c3')!).needsCatchUp).toBe(false);
  });

  it('validates type, date, description and customer', () => {
    const errors = (o: object) => {
      const r = addInteraction(sample, { customerId: 'c3', type: 'call', date: TODAY, summary: 'ok', ...o });
      return r.ok ? {} : r.errors;
    };
    expect(errors({ type: 'fax' }).type).toMatch(/Choose/);
    expect(errors({ date: '2026-10-15' }).date).toBe('The date can’t be in the future.');
    expect(errors({ date: '2026-02-30' }).date).toBe('Choose the date it happened.');
    expect(errors({ summary: '   ' }).summary).toBe('Describe what happened.');
    expect(errors({ summary: 'x'.repeat(501) }).summary).toMatch(/under 500/);
    expect(errors({ customerId: 'nobody' }).customer).toMatch(/no longer exists/);
  });
});

describe('sample data', () => {
  it('is consistent: known customers, unique emails, no future dates', () => {
    const ids = new Set(sample.customers.map((c) => c.id));
    for (const n of sample.interactions) {
      expect(ids.has(n.customerId)).toBe(true);
      expect(n.date <= TODAY).toBe(true);
    }
    const emails = sample.customers.flatMap((c) => (c.email ? [c.email] : []));
    expect(new Set(emails).size).toBe(emails.length);
    for (const c of sample.customers) expect(validateCustomer(sample, customerToInput(c), c.id), c.name).toEqual({});
  });

  it('uses reserved example domains only', () => {
    for (const c of sample.customers) if (c.email) expect(c.email).toMatch(/@([a-z]+\.)?example\.com$/);
  });

  it('restores the same records for the same day (reset)', () => {
    expect(createCrmSample(TODAY)).toEqual(sample);
  });
});
