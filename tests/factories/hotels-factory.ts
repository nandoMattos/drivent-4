import faker from "@faker-js/faker";
import { Hotel } from "@prisma/client";
import { prisma } from "@/config";

export function createHotel(params: Partial<Hotel> = {}): Promise<Hotel> {
  return prisma.hotel.create({
    data: {
      name: params.name || faker.lorem.sentence(),
      image: params.image || faker.image.imageUrl(),
    },
  });
}
