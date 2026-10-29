'use client';

import { isSettledStatus, type Payment } from '@pay/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { API_URL } from './api';
import { queryKeys } from './query-keys';

export function usePaymentStream(paymentId: string | null): boolean {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!paymentId) {
      return;
    }

    let source: EventSource | null = null;
    let retryTimer: number | null = null;
    let retryDelay = 1_000;
    let stopped = false;

    function closeSource() {
      source?.close();
      source = null;
      setConnected(false);
    }

    function connect() {
      if (stopped) {
        return;
      }

      closeSource();
      source = new EventSource(`${API_URL}/payments/${paymentId}/stream`);

      source.onopen = () => {
        retryDelay = 1_000;
        setConnected(true);
      };

      source.onmessage = (event) => {
        try {
          const payment = JSON.parse(event.data) as Payment;
          queryClient.setQueryData(queryKeys.payment(payment.id), payment);
          void queryClient.invalidateQueries({ queryKey: queryKeys.timeline(payment.id) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks(payment.id) });

          if (isSettledStatus(payment.status)) {
            stopped = true;
            closeSource();
          }
        } catch {
          // Ignore malformed frames; polling remains available as a fallback.
        }
      };

      source.onerror = () => {
        if (stopped) {
          return;
        }

        closeSource();
        retryTimer = window.setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 15_000);
          connect();
        }, retryDelay);
      };
    }

    connect();

    return () => {
      stopped = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      closeSource();
    };
  }, [paymentId, queryClient]);

  return connected;
}
