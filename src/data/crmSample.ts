import type { CrmBook, Customer, Interaction } from '../types/crm';
import { addDays, localToday } from '../utils/dates';

/*
 * Fictional sample records for the Simple CRM demo. Every person, company,
 * email address and phone number is invented; emails use the reserved
 * example.com domain. Dates are relative to the visitor's today.
 */

export const crmBusiness = { name: 'Harbor & Pine Supply Co.', city: 'Coimbatore' };

interface CustomerSeed extends Omit<Customer, 'addedOn' | 'updatedOn'> {
  addedDaysAgo: number;
  updatedDaysAgo: number;
}

const customerSeeds: CustomerSeed[] = [
  { id: 'c1', name: 'Anjali Raman', company: 'Brightline Interiors', role: 'Founder', email: 'anjali@brightline.example.com', phone: '+91 98450 12345', city: 'Coimbatore', status: 'active', tags: ['interiors', 'repeat'], notes: 'Prefers WhatsApp for quick questions and email for quotes. Orders glass jars and mug sets for client handovers.', addedDaysAgo: 410, updatedDaysAgo: 3 },
  { id: 'c2', name: 'Vikram Iyer', company: 'Nilgiri Tea Traders', role: 'Purchase manager', email: 'vikram.iyer@nilgiritea.example.com', phone: '+91 94430 55102', city: 'Ooty', status: 'active', tags: ['wholesale', 'festive'], notes: 'Places a large gifting order before Diwali each year. Needs GST invoices with the company’s GSTIN.', addedDaysAgo: 620, updatedDaysAgo: 12 },
  { id: 'c3', name: 'Meera Krishnan', company: 'Meridian Dental Clinic', role: 'Practice manager', email: 'meera@meridiandental.example.com', phone: '044 2811 4400', city: 'Chennai', status: 'active', tags: ['healthcare'], addedDaysAgo: 300, updatedDaysAgo: 41 },
  { id: 'c4', name: 'Rahul Menon', company: 'Saffron Events Co.', role: 'Operations lead', email: 'rahul@saffronevents.example.com', phone: '+91 80 4123 9900', city: 'Bengaluru', status: 'active', tags: ['events', 'corporate gifting'], notes: 'Books hampers for client events. Lead time is usually two weeks.', addedDaysAgo: 250, updatedDaysAgo: 2 },
  { id: 'c5', name: 'Fathima Nazeer', company: 'Coastal Print Works', role: 'Owner', email: 'fathima@coastalprint.example.com', city: 'Puducherry', status: 'active', tags: ['print'], addedDaysAgo: 190, updatedDaysAgo: 8 },
  { id: 'c6', name: 'Daniel Brooks', company: 'Northwind Boutique Hotels', role: 'Guest experience manager', email: 'd.brooks@northwind.example.com', phone: '+44 20 7946 0321', city: 'London', status: 'prospect', tags: ['hospitality', 'export'], notes: 'Interested in scented candles for guest rooms. Asked about shipping to the UK.', addedDaysAgo: 18, updatedDaysAgo: 4 },
  { id: 'c7', name: 'Priya Sundaram', company: 'Greenfield Academy', role: 'Administrator', email: 'office@greenfield.example.com', phone: '+91 427 244 1100', city: 'Salem', status: 'active', tags: ['education'], notes: 'Buys notebook bundles at the start of each term.', addedDaysAgo: 520, updatedDaysAgo: 15 },
  { id: 'c8', name: 'Karthik Rao', company: 'Urban Nest Realty', role: 'Director', phone: '+91 99620 77881', city: 'Madurai', status: 'active', tags: ['real estate', 'corporate gifting'], addedDaysAgo: 160, updatedDaysAgo: 34 },
  { id: 'c9', name: 'Lakshmi Narayanan', company: 'Lotus Wellness Studio', role: 'Owner', email: 'lakshmi@lotuswellness.example.com', city: 'Tiruchirappalli', status: 'active', tags: ['wellness'], addedDaysAgo: 140, updatedDaysAgo: 22 },
  { id: 'c10', name: 'Sara Haddad', company: 'Cedar & Co. Gifts', role: 'Buyer', email: 'sara@cedarco.example.com', phone: '+971 4 555 0142', city: 'Dubai', status: 'prospect', tags: ['export', 'retail'], notes: 'Met at the Chennai gift fair. Wants a catalogue and minimum order quantities.', addedDaysAgo: 26, updatedDaysAgo: 10 },
  { id: 'c11', name: 'Arjun Pillai', company: 'Pillai Family Stores', email: 'arjun.pillai@example.com', phone: '+91 97890 33004', city: 'Kochi', status: 'prospect', tags: ['retail'], addedDaysAgo: 44, updatedDaysAgo: 44 },
  { id: 'c12', name: 'Nisha Thomas', role: 'Freelance stylist', email: 'nisha.styles@example.com', phone: '+91 90030 66218', city: 'Chennai', status: 'prospect', tags: ['freelance'], notes: 'Sources props for photo shoots. Small but frequent orders likely.', addedDaysAgo: 9, updatedDaysAgo: 2 },
  { id: 'c13', name: 'Gopal Swamy', company: 'Swamy Textiles', role: 'Partner', phone: '0422 239 4455', city: 'Tiruppur', status: 'inactive', tags: ['wholesale'], notes: 'Moved purchasing to their head office in 2025. Keep for history.', addedDaysAgo: 900, updatedDaysAgo: 210 },
  { id: 'c14', name: 'Emily Chen', company: 'Harbourline Cafés', role: 'Owner', email: 'emily@harbourline.example.com', phone: '+1 415 555 0187', city: 'San Francisco', status: 'inactive', tags: ['hospitality', 'export'], addedDaysAgo: 700, updatedDaysAgo: 150 },
];

interface InteractionSeed extends Omit<Interaction, 'date'> {
  daysAgo: number;
}

const interactionSeeds: InteractionSeed[] = [
  { id: 'n1', customerId: 'c1', daysAgo: 3, type: 'call', summary: 'Confirmed 6 cases of glass storage jars for a client handover next week.' },
  { id: 'n2', customerId: 'c1', daysAgo: 19, type: 'email', summary: 'Sent a quote for ceramic mug sets with custom glaze.' },
  { id: 'n3', customerId: 'c1', daysAgo: 64, type: 'meeting', summary: 'Visited their studio to see the new showroom and discuss quarterly needs.' },
  { id: 'n4', customerId: 'c2', daysAgo: 12, type: 'meeting', summary: 'Reviewed the festive hamper list for Diwali; 18 hampers plus a consultation.' },
  { id: 'n5', customerId: 'c2', daysAgo: 25, type: 'message', summary: 'Asked for sample photos of the new hamper packaging.' },
  { id: 'n6', customerId: 'c2', daysAgo: 380, type: 'note', summary: 'Last year’s order arrived two days late; offer earlier dispatch this year.' },
  { id: 'n7', customerId: 'c3', daysAgo: 41, type: 'email', summary: 'Shared the price list for premium pen sets and desk organisers.' },
  { id: 'n8', customerId: 'c3', daysAgo: 95, type: 'call', summary: 'Discussed welcome kits for new patients.' },
  { id: 'n9', customerId: 'c4', daysAgo: 2, type: 'call', summary: 'Rush request: 40 corporate hampers with engraving for an event on the 26th.' },
  { id: 'n10', customerId: 'c4', daysAgo: 30, type: 'email', summary: 'Sent engraving proofs for approval.' },
  { id: 'n11', customerId: 'c4', daysAgo: 58, type: 'meeting', summary: 'Planning meeting for their year-end client events.' },
  { id: 'n12', customerId: 'c5', daysAgo: 8, type: 'message', summary: 'Asked whether desk organisers come in a darker finish.' },
  { id: 'n13', customerId: 'c5', daysAgo: 40, type: 'call', summary: 'Placed an order for 20 desk organisers.' },
  { id: 'n14', customerId: 'c6', daysAgo: 4, type: 'email', summary: 'Sent the candle range and indicative shipping costs to London.' },
  { id: 'n15', customerId: 'c6', daysAgo: 18, type: 'meeting', summary: 'Video call to introduce the business and understand their room count.' },
  { id: 'n16', customerId: 'c7', daysAgo: 15, type: 'call', summary: 'Confirmed notebook bundles and greeting card packs for the new term.' },
  { id: 'n17', customerId: 'c7', daysAgo: 140, type: 'note', summary: 'Term starts in June and November; they order about three weeks before.' },
  { id: 'n18', customerId: 'c8', daysAgo: 34, type: 'call', summary: 'Ordered ceramic mug sets as gifts for new home owners.' },
  { id: 'n19', customerId: 'c8', daysAgo: 70, type: 'message', summary: 'Asked for gift-wrapping options.' },
  { id: 'n20', customerId: 'c9', daysAgo: 22, type: 'email', summary: 'Sent the scented candle restock options.' },
  { id: 'n21', customerId: 'c9', daysAgo: 52, type: 'meeting', summary: 'Tasted three new candle scents at the studio.' },
  { id: 'n22', customerId: 'c10', daysAgo: 10, type: 'email', summary: 'Shared the catalogue PDF and minimum order quantities.' },
  { id: 'n23', customerId: 'c10', daysAgo: 26, type: 'meeting', summary: 'Met at the Chennai gift fair stall.' },
  { id: 'n24', customerId: 'c12', daysAgo: 2, type: 'message', summary: 'Asked for the cotton kitchen towels in muted colours for a shoot.' },
  { id: 'n25', customerId: 'c12', daysAgo: 9, type: 'call', summary: 'Introductory call; works with two local magazines.' },
  { id: 'n26', customerId: 'c13', daysAgo: 210, type: 'note', summary: 'Purchasing moved to head office. No further orders expected from this branch.' },
  { id: 'n27', customerId: 'c13', daysAgo: 400, type: 'meeting', summary: 'Annual review of wholesale towel orders.' },
  { id: 'n28', customerId: 'c14', daysAgo: 150, type: 'email', summary: 'Closed their account after the café group changed suppliers.' },
];

export function createCrmSample(today: string = localToday()): CrmBook {
  const customers: Customer[] = customerSeeds.map(({ addedDaysAgo, updatedDaysAgo, ...rest }) => ({
    ...rest,
    addedOn: addDays(today, -addedDaysAgo),
    updatedOn: addDays(today, -updatedDaysAgo),
  }));
  const interactions: Interaction[] = interactionSeeds.map(({ daysAgo, ...rest }) => ({ ...rest, date: addDays(today, -daysAgo) }));
  return { today, customers, interactions };
}
