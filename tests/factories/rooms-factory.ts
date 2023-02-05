import faker from "@faker-js/faker";
import { Room } from "@prisma/client";
import { prisma } from "@/config";

export function createRoom(params: Partial<Room> = {}): Promise<Room> {
  return prisma.room.create({
    data: {
      name: params.name || faker.lorem.sentence(),
      capacity: params.capacity || faker.datatype.number({ min: 1, max: 5 }),
      hotelId: params.hotelId,
    },
  });
}
