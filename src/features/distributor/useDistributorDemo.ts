import { useMemo, useState } from 'react';
import type { DistributorBook } from '../../types/distributor';
import { createDistributorSample } from '../../data/distributorSample';
import {
  adjustStock,
  cancelOrder,
  cancelPurchase,
  confirmOrder,
  createOrder,
  createProduct,
  createPurchase,
  fulfilOrder,
  receivePurchase,
  recordPayment,
  saveParty,
  updateOrder,
  updateProduct,
  updatePurchase,
  type OrderInput,
  type PartyInput,
  type PartyKind,
  type PaymentInput,
  type ProductInput,
  type PurchaseInput,
} from './distributorLogic';

/**
 * The demo's single source of truth: one in-memory book of products, parties,
 * purchases, orders, payments and stock movements (the same pattern as the
 * other Vixidia demos). Stock, balances and every figure are derived from it.
 * A failed action returns errors and leaves the book exactly as it was.
 * Nothing is saved; reloading or resetting restores the sample data.
 */
export function useDistributorDemo() {
  const [book, setBook] = useState<DistributorBook>(() => createDistributorSample());
  // The data as last loaded or reset; anything else means the visitor has changed something.
  const [baseline, setBaseline] = useState<DistributorBook>(book);

  const actions = useMemo(() => {
    function commit<R extends { ok: true; book: DistributorBook } | { ok: false }>(result: R): R {
      const r: { ok: true; book: DistributorBook } | { ok: false } = result;
      if (r.ok) setBook(r.book);
      return result;
    }
    return {
      createProduct: (input: ProductInput) => commit(createProduct(book, input)),
      updateProduct: (id: string, input: ProductInput) => commit(updateProduct(book, id, input)),
      adjustStock: (input: Parameters<typeof adjustStock>[1]) => commit(adjustStock(book, input)),
      saveParty: (kind: PartyKind, input: PartyInput, id?: string) => commit(saveParty(book, kind, input, id)),
      createPurchase: (input: PurchaseInput, receive: boolean) => commit(createPurchase(book, input, { receive })),
      updatePurchase: (id: string, input: PurchaseInput) => commit(updatePurchase(book, id, input)),
      receivePurchase: (id: string) => commit(receivePurchase(book, id)),
      cancelPurchase: (id: string) => commit(cancelPurchase(book, id)),
      createOrder: (input: OrderInput, confirm: boolean) => commit(createOrder(book, input, { confirm })),
      updateOrder: (id: string, input: OrderInput) => commit(updateOrder(book, id, input)),
      confirmOrder: (id: string) => commit(confirmOrder(book, id)),
      fulfilOrder: (id: string) => commit(fulfilOrder(book, id)),
      cancelOrder: (id: string) => commit(cancelOrder(book, id)),
      pay: (input: PaymentInput) => commit(recordPayment(book, input)),
      reset: () => {
        const fresh = createDistributorSample();
        setBaseline(fresh);
        setBook(fresh);
      },
    };
  }, [book]);

  return { book, actions, changed: book !== baseline };
}
