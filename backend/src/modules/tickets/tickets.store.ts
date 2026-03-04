import {
  createTicket,
  findTicketByCode,
  getTicket,
  listTickets,
  nextTicketNumber,
  removeTicket,
  updateTicket
} from './tickets.store.operations.js';

export type {
  IntakeTicketPriority,
  IntakeTicketStatus,
  StoredIntakeTicket,
  StoredTicketComment
} from './tickets.store.types.js';

export const ticketsStore = {
  list: listTickets,
  get: getTicket,
  create: createTicket,
  update: updateTicket,
  remove: removeTicket,
  findByCode: findTicketByCode,
  nextTicketNumber
};
