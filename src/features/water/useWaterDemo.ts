import { useMemo, useReducer, useRef, useState } from 'react';
import { createSampleState, sampleBusiness } from '../../data/waterSample';
import { dueRegulars, waterReducer, summarize, type NewOrderInput } from './waterLogic';
import { useToast } from '../../components/Toast';

/**
 * Demo state lives only in memory: nothing is stored or sent anywhere,
 * and reloading the page restores the sample data.
 */
export function useWaterDemo() {
  const [state, dispatch] = useReducer(waterReducer, undefined, createSampleState);
  // The data as last loaded or reset; anything else means the visitor has changed something.
  const [baseline, setBaseline] = useState(state);
  const { toast, notify } = useToast(4500);
  const nextSeq = useRef(state.nextOrderSeq);
  nextSeq.current = state.nextOrderSeq;
  const current = useRef(state);
  current.current = state;

  const summary = useMemo(() => summarize(state, sampleBusiness.today), [state]);

  const actions = useMemo(
    () => ({
      markDelivered(orderId: string, label: string) {
        dispatch({ type: 'markDelivered', orderId });
        notify(`${label} marked delivered.`);
      },
      /** Finishes a stop on the round: delivered, empties taken back, and cash if it was collected. */
      completeStop(orderId: string, label: string, emptiesCollected: number, cashCollected: boolean) {
        dispatch({ type: 'completeStop', orderId, emptiesCollected, cashCollected });
        const empties = `${emptiesCollected} ${emptiesCollected === 1 ? 'empty' : 'empties'} back`;
        notify(`${label} delivered · ${empties}${cashCollected ? ' · cash collected' : ''}.`);
      },
      /** Adds today's orders for every regular customer who is due but not yet on the round. */
      addRegulars() {
        const count = dueRegulars(current.current, sampleBusiness.today).length;
        if (count === 0) return;
        dispatch({ type: 'addRegulars', day: sampleBusiness.today, unitPrice: sampleBusiness.defaultUnitPrice, prefix: sampleBusiness.orderPrefix });
        notify(`${count} regular ${count === 1 ? 'delivery' : 'deliveries'} added to today’s run.`);
      },
      markPaid(orderId: string, label: string) {
        dispatch({ type: 'markPaid', orderId });
        notify(`Payment recorded for ${label}.`);
      },
      settleCustomer(customerId: string, name: string) {
        dispatch({ type: 'settleCustomer', customerId });
        notify(`All dues from ${name} marked paid.`);
      },
      /** Adds a validated order and returns its order number. */
      addOrder(input: NewOrderInput): string {
        const number = `${sampleBusiness.orderPrefix}-${nextSeq.current}`;
        dispatch({
          type: 'addOrder',
          input,
          today: sampleBusiness.today,
          unitPrice: sampleBusiness.defaultUnitPrice,
          prefix: sampleBusiness.orderPrefix,
        });
        notify(`Order ${number} added to today’s run.`);
        return number;
      },
      reset() {
        const fresh = createSampleState();
        setBaseline(fresh);
        dispatch({ type: 'reset', state: fresh });
        notify('Sample data restored.');
      },
    }),
    [notify],
  );

  return { state, summary, actions, toast, changed: state !== baseline };
}

export type WaterDemoApi = ReturnType<typeof useWaterDemo>;
export type WaterActions = WaterDemoApi['actions'];
