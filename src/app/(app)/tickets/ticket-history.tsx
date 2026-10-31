"use client";

import { useEffect, useState } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { describeTicketEvent, formatEventDateTime } from "@/lib/client/ticket-history";
import type { PublicTicketEvent } from "@/types/ticket-event";
import styles from "../page-shared.module.css";

type EventsPayload = { events: PublicTicketEvent[] };

export function TicketHistory({
  ticketId,
  userName,
}: {
  ticketId: string;
  userName: (id: string) => string;
}) {
  const [events, setEvents] = useState<PublicTicketEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiRequest<EventsPayload>(`/api/tickets/${ticketId}/events`)
      .then((result) => {
        if (!cancelled) setEvents(result.events);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Falha ao carregar o histórico");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  return (
    <section className={styles.attachmentSection} aria-label="Histórico do chamado">
      <h3>Histórico</h3>
      {error ? (
        <div className="error-banner">{error}</div>
      ) : events === null ? (
        <p className="muted">Carregando histórico…</p>
      ) : events.length === 0 ? (
        <p className="empty-state">Nenhum evento registrado.</p>
      ) : (
        <ul className={styles.entryList}>
          {events.map((event) => (
            <li key={event.id}>
              <strong>{event.actorName}</strong>
              <span>{describeTicketEvent(event, userName)}</span>
              <span className="muted">{formatEventDateTime(event.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
