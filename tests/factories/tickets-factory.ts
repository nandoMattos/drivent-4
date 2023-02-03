import faker from "@faker-js/faker";
import { prisma } from "@/config";
import { TicketStatus, TicketType } from "@prisma/client";

export async function createTicketType(params: Partial<TicketType> = {}): Promise<TicketType> {
  return prisma.ticketType.create({
    data: {
      name: params.name || faker.name.findName(),
      price: params.price || faker.datatype.number(),
      isRemote: params.isRemote === undefined ? faker.datatype.boolean() : params.isRemote,
      includesHotel: params.includesHotel === undefined ? faker.datatype.boolean() : params.includesHotel,
    },
  });
}

export async function createTicket(enrollmentId: number, ticketTypeId: number, status: TicketStatus) {
  return prisma.ticket.create({
    data: {
      enrollmentId,
      ticketTypeId,
      status,
    },
  });
}
