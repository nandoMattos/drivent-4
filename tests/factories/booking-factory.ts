import { prisma } from "@/config";

export function createBooking(userId: number, roomId: number) { 
  return prisma.booking.create({
    data: { userId, roomId }
  });
}
