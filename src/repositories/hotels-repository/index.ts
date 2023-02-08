import { prisma } from "@/config";
import { Hotel, PrismaPromise, Room } from "@prisma/client";

function findAll(): PrismaPromise<Hotel[]> {
  return prisma.hotel.findMany();
}

export type HotelAndRooms = Hotel & {Rooms: Room[];}
function findById(id: number): PrismaPromise<HotelAndRooms> {
  return prisma.hotel.findFirst(
    { where: 
      { id },
    include: {
      Rooms: true
    } 
    }
    
  );
}

const hotelsRepository = {
  findAll,
  findById
};

export default hotelsRepository;
