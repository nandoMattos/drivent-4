import { prisma } from "@/config";
import { Booking, PrismaPromise } from "@prisma/client";

function createBookig(userId: number, roomId: number): PrismaPromise<Booking> {
  return prisma.booking.create({
    data: { roomId, userId }
  });
}

function findOneByUserId(userId: number): PrismaPromise<Booking> {
  return prisma.booking.findFirst({
    where: { userId }
  });
}

const bookingRepository = {
  createBookig,
  findOneByUserId
};

export default bookingRepository;
