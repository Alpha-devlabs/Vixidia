import { useMemo, useState } from 'react';
import type { WaterBook } from '../../types/water';
import { createWaterSample } from '../../data/waterSample';
import {
  completeDelivery,
  createCustomer,
  createOrder,
  failDelivery,
  recordPayment,
  rescheduleDelivery,
  updateCustomer,
  type CompletionInput,
  type CustomerInput,
  type OrderInput,
} from './waterLogic';

/**
 * The demo's single source of truth: one in-memory book of customers,
 * deliveries and payments (the same pattern as the other Vixidia demos). Every
 * balance, can count and dashboard figure is derived from it, so recording a
 * delivery updates every screen at once. Nothing is saved; reloading or
 * resetting restores the sample data.
 */
export function useWaterDemo() {
  const [book, setBook] = useState<WaterBook>(() => createWaterSample());
  // Keep the first date so a reset restores exactly the data first shown.
  const [initialToday] = useState(book.today);

  const actions = useMemo(() => {
    function commit<R extends { ok: true; book: WaterBook } | { ok: false }>(result: R): R {
      const r: { ok: true; book: WaterBook } | { ok: false } = result;
      if (r.ok) setBook(r.book);
      return result;
    }
    return {
      addOrder: (input: OrderInput) => commit(createOrder(book, input)),
      complete: (deliveryId: string, input: CompletionInput) => commit(completeDelivery(book, deliveryId, input)),
      fail: (deliveryId: string, reason: string) => commit(failDelivery(book, deliveryId, reason)),
      reschedule: (deliveryId: string, date: string) => commit(rescheduleDelivery(book, deliveryId, date)),
      pay: (input: { customerId: string; amount: string; method: string }) => commit(recordPayment(book, input)),
      createCustomer: (input: CustomerInput) => commit(createCustomer(book, input)),
      updateCustomer: (id: string, input: CustomerInput) => commit(updateCustomer(book, id, input)),
      reset: () => setBook(createWaterSample(initialToday)),
    };
  }, [book, initialToday]);

  return { book, actions };
}
