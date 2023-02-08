import { prisma } from "@/config";
import { Booking, PrismaPromise, Room } from "@prisma/client";

function createBookig(userId: number, roomId: number): PrismaPromise<Booking> {
  return prisma.booking.create({
    data: { roomId, userId }
  });
}

export type BookingAndRoom = Booking & {Room: Room;}

function findOneByUserId(userId: number): PrismaPromise<BookingAndRoom> {
  return prisma.booking.findFirst({
    where: { userId },
    include: {
      Room: true
    }
  });
}

const bookingRepository = {
  createBookig,
  findOneByUserId
};

export default bookingRepository;
