import { paymentRequiredError } from "@/errors";
import hotelsRepository from "@/repositories/hotels-repository";
import enrollmentsService from "../enrollments-service";

async function findAllHotels(userId: number) {
  const { Ticket } = await enrollmentsService.verifyEnrollmentAndTicket(userId);
  const { status } = Ticket[0];
  const { includesHotel, isRemote } = Ticket[0].TicketType;

  if(status !== "PAID" || isRemote === true ||  includesHotel === false) {
    throw paymentRequiredError();
  }

  return await hotelsRepository.findAll();
}

const hotelsService = {
  findAllHotels
};

export default hotelsService;

