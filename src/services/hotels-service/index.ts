import { notFoundError, paymentRequiredError } from "@/errors";
import hotelsRepository from "@/repositories/hotels-repository";
import { Hotel } from "@prisma/client";
import enrollmentsService from "../enrollments-service";
import ticketService from "../tickets-service";

async function findAllHotels(userId: number): Promise<Hotel[]> {
  const { Ticket } = await enrollmentsService.verifyEnrollmentAndTicket(userId);
  if(Ticket[0].status !== "PAID") {
    throw paymentRequiredError();
  }

  await ticketService.verifyIfIncludesHotel(Ticket[0].id);

  return await hotelsRepository.findAll();
}

async function findHotelById(userId: number, hotelId: number): Promise<Hotel> {
  const { Ticket } = await enrollmentsService.verifyEnrollmentAndTicket(userId);
  if(Ticket[0].status !== "PAID") {
    throw paymentRequiredError();
  }

  await ticketService.verifyIfIncludesHotel(Ticket[0].id);

  const hotel = await hotelsRepository.findById(hotelId);
  if(!hotel) {
    throw notFoundError();
  }
  return hotel;
}

const hotelsService = {
  findAllHotels,
  findHotelById
};

export default hotelsService;
