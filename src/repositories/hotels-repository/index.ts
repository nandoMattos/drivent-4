import { prisma } from "@/config";

function findAll() {
  return prisma.hotel.findMany();
}

const hotelsRepository = {
  findAll
};

export default hotelsRepository;
