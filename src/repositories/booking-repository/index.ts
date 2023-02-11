import { prisma } from "@/config";
import { Booking, PrismaPromise, Room } from "@prisma/client";

function upsertBooking(userId: number, roomId: number, bookingId = 0): PrismaPromise<Booking> {
  return prisma.booking.upsert({
    where: { id: bookingId },
    update: { roomId },
    create: { roomId, userId }
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
  upsertBooking,
  findOneByUserId
};

export default bookingRepository;
