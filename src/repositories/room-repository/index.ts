import { prisma } from "@/config";
import { Booking, PrismaPromise, Room } from "@prisma/client";

export type RoomAndBooking = Room & {Booking: Booking[]} 
function findRoomById(id: number): PrismaPromise<RoomAndBooking> {
  return prisma.room.findFirst({ 
    where: { id },
    include: { Booking: true } 

  });
}

const roomRepository = {
  findRoomById,
};

export default roomRepository;
