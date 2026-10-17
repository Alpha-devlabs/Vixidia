/**
 * Salon Management domain types.
 *
 * Only facts are stored: the service menu, stylists, customers, appointments
 * (with a snapshot of what was booked) and payments. Durations, totals,
 * schedules, visit history and every dashboard figure are derived in
 * `features/salon/salonLogic.ts`.
 */
import type { IsoDay, Paise } from './invoice';

export type { IsoDay, Paise };

export type ServiceCategory = 'hair' | 'skin' | 'nails';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMin: number;
  pricePaise: Paise;
}

export interface Stylist {
  id: string;
  name: string;
  role: string;
  /** Service categories this person does. */
  categories: ServiceCategory[];
}

export interface Customer {
  id: string;
  name: string;
  /** Fictional numbers only. */
  phone: string;
  /** Optional; fictional addresses only (example.com). */
  email: string;
  notes: string;
  createdOn: IsoDay;
}

/**
 * A service as it was booked. Name, duration and price are copied from the
 * menu at booking time, so later menu changes never rewrite an appointment.
 */
export interface BookedService {
  serviceId: string;
  name: string;
  category: ServiceCategory;
  durationMin: number;
  pricePaise: Paise;
}

export type AppointmentStatus = 'booked' | 'completed' | 'cancelled';
export type CancelReason = 'customer' | 'no_show' | 'salon';

export interface Appointment {
  id: string;
  customerId: string;
  stylistId: string;
  date: IsoDay;
  /** 24-hour "HH:MM". The end is derived from the booked services. */
  start: string;
  services: BookedService[];
  status: AppointmentStatus;
  cancelReason?: CancelReason;
  /** Set when moved: where it was before the latest reschedule. */
  movedFrom?: { date: IsoDay; start: string; stylistId: string };
}

export type PaymentMethod = 'upi' | 'cash' | 'card';

export interface SalonPayment {
  id: string;
  appointmentId: string;
  date: IsoDay;
  amountPaise: Paise;
  method: PaymentMethod;
}

export interface OpeningHours {
  /** "HH:MM". */
  open: string;
  close: string;
  /** Weekday the salon is closed (0 = Sunday). */
  closedWeekday: number;
}

/** Everything the demo knows. One instance is the single source of truth for every screen. */
export interface SalonBook {
  today: IsoDay;
  hours: OpeningHours;
  services: Service[];
  stylists: Stylist[];
  customers: Customer[];
  appointments: Appointment[];
  payments: SalonPayment[];
}
