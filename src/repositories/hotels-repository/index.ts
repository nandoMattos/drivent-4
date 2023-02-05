import { prisma } from "@/config";
import { Hotel, PrismaPromise } from "@prisma/client";

function findAll(): PrismaPromise<Hotel[]> {
  return prisma.hotel.findMany();
}

function findById(id: number): PrismaPromise<Hotel> {
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
