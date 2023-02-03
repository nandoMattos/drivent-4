import { paymentRequiredError } from "@/errors";
import hotelsRepository from "@/repositories/hotels-repository";
import enrollmentsService from "../enrollments-service";
import ticketService from "../tickets-service";

async function findAllHotels(userId: number) {
  const { Ticket } = await enrollmentsService.verifyEnrollmentAndTicket(userId);
  if(Ticket[0].status !== "PAID") {
    throw paymentRequiredError();
  }

  await ticketService.verifyIfIncludesHotel(Ticket[0].id);

  return await hotelsRepository.findAll();
}

async function findHotelById(userId: number, hotelId: number) {
  const { Ticket } = await enrollmentsService.verifyEnrollmentAndTicket(userId);
  if(Ticket[0].status !== "PAID") {
    throw paymentRequiredError();
  }

  await ticketService.verifyIfIncludesHotel(Ticket[0].id);

  return await hotelsRepository.findById(hotelId);
}

const hotelsService = {
  findAllHotels,
  findHotelById
};

export default hotelsService;

