import { prisma } from "@/config";

function findAll() {
  return prisma.hotel.findMany();
}

function findById(id: number) {
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
