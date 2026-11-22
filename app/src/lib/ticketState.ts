/**
 * Ticket status state machine (see 02_Test_Case_Design/04_State_Transition.md).
 *
 *            PROMOTE            PROMOTE
 *     WL ───────────────► RAC ───────────────► CNF
 *      │ \                 │                    │
 *      │  \ CHART_PREPARED │ CANCEL             │ CANCEL
 *      │   \               ▼                    ▼
 *      └────┴──CANCEL───► CAN ◄─────────────────┘
 *
 * CHART_PREPARED on RAC / CNF keeps the status (self-transition).
 * CAN is terminal: every event on it is rejected.
 */

export type TicketStatus = 'CNF' | 'RAC' | 'WL' | 'CAN';
export type TicketEvent = 'PROMOTE' | 'CANCEL' | 'CHART_PREPARED';

export const STATUS_LABEL: Record<TicketStatus, string> = {
  CNF: 'Confirmed',
  RAC: 'RAC',
  WL: 'Waitlisted',
  CAN: 'Cancelled',
};

export const TRANSITIONS: Record<TicketStatus, Partial<Record<TicketEvent, TicketStatus>>> = {
  WL: { PROMOTE: 'RAC', CANCEL: 'CAN', CHART_PREPARED: 'CAN' },
  RAC: { PROMOTE: 'CNF', CANCEL: 'CAN', CHART_PREPARED: 'RAC' },
  CNF: { CANCEL: 'CAN', CHART_PREPARED: 'CNF' },
  CAN: {},
};

export class InvalidTransitionError extends Error {
  constructor(public readonly from: TicketStatus, public readonly event: TicketEvent) {
    super(`Invalid transition: ${event} is not allowed for a ${STATUS_LABEL[from]} ticket`);
    this.name = 'InvalidTransitionError';
  }
}

export function canTransition(from: TicketStatus, event: TicketEvent): boolean {
  return TRANSITIONS[from][event] !== undefined;
}

export function nextStatus(from: TicketStatus, event: TicketEvent): TicketStatus {
  const to = TRANSITIONS[from][event];
  if (to === undefined) throw new InvalidTransitionError(from, event);
  return to;
}
