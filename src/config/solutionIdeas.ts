import { Dumbbell, GraduationCap, Scissors, Truck, type LucideIcon } from 'lucide-react';

/**
 * Industry-specific solution ideas shown in the solutions finder.
 *
 * These are catalogue entries only: nothing here is built, in development or
 * available, and none has a page, route or demo. They exist so visitors can find
 * them by search and tell us they would use them. When an idea becomes a real
 * product it moves to the product registry (config/products.ts) instead, as
 * Water Delivery Management did.
 */
export interface SolutionIdea {
  id: string;
  name: string;
  /** Who it is for, shown on the card, e.g. "Fitness & gyms". */
  industry: string;
  summary: string;
  /** What it would help manage. Planned scope, not features that exist. */
  wouldCover: readonly string[];
  /** Business types, synonyms and problems people might search for. */
  searchKeywords: readonly string[];
  icon: LucideIcon;
}

export const solutionIdeas: readonly SolutionIdea[] = [
  {
    id: 'gym',
    name: 'Gym Membership Management',
    industry: 'Fitness & gyms',
    summary: 'For gyms and fitness studios that run on memberships and renewals.',
    wouldCover: ['Member records', 'Membership plans', 'Renewals', 'Attendance'],
    searchKeywords: ['gym', 'gyms', 'fitness', 'fitness centre', 'fitness center', 'fitness studio', 'health club', 'yoga studio', 'crossfit', 'members', 'membership', 'renewals', 'trainers', 'workout', 'attendance'],
    icon: Dumbbell,
  },
  {
    id: 'salon',
    name: 'Salon Management',
    industry: 'Salons & beauty',
    summary: 'For salons, barbers and beauty parlours that book appointments and serve regulars.',
    wouldCover: ['Appointments', 'Customer history', 'Service records'],
    searchKeywords: ['salon', 'salons', 'beauty', 'beauty parlour', 'beauty parlor', 'parlour', 'barber', 'barbershop', 'hair', 'spa', 'nails', 'stylist', 'appointments', 'bookings', 'services'],
    icon: Scissors,
  },
  {
    id: 'tuition',
    name: 'Tuition Centre Management',
    industry: 'Education & coaching',
    summary: 'For tuition and coaching centres managing students, batches and fees.',
    wouldCover: ['Student records', 'Fee tracking', 'Attendance'],
    searchKeywords: ['tuition', 'tuition centre', 'tuition center', 'coaching', 'coaching centre', 'coaching classes', 'classes', 'tutor', 'tutors', 'academy', 'institute', 'students', 'batches', 'fees', 'fee collection', 'attendance'],
    icon: GraduationCap,
  },
  {
    id: 'distributor',
    name: 'Small Distributor Management',
    industry: 'Wholesale & distribution',
    summary: 'For small distributors and wholesalers supplying shops on credit.',
    wouldCover: ['Orders', 'Inventory', 'Customer balances', 'Delivery tracking'],
    searchKeywords: ['distributor', 'distributors', 'distribution', 'wholesale', 'wholesaler', 'dealer', 'stockist', 'supplier', 'inventory', 'stock', 'orders', 'deliveries', 'retailers', 'credit', 'outstanding balance'],
    icon: Truck,
  },
];
