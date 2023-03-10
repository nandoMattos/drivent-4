import { forbiddenError, notFoundError, paymentRequiredError } from "@/errors";
import bookingRepository, { BookingAndRoom } from "@/repositories/booking-repository";
import roomRepository from "@/repositories/room-repository";
import { exclude } from "@/utils/prisma-utils";
import { Booking } from "@prisma/client";
import enrollmentsService from "../enrollments-service";
import ticketService from "../tickets-service";

async function insertBooking(userId: number, roomId: number): Promise<Booking> {
  const { Ticket } = await enrollmentsService.verifyEnrollmentAndTicket(userId);
  if(Ticket[0].status !== "PAID") {
    throw paymentRequiredError();
  }
  await ticketService.verifyIfIncludesHotel(Ticket[0].id);

  await verifyUserBooking(userId);
  await verifyRoomCapacity(roomId);

  return await bookingRepository.upsertBooking(userId, roomId);
}

type GetBookingAndRoom = Omit<BookingAndRoom, "createdAt" | "updatedAt" | "userId" | "roomId" >
async function getUserBooking(userId: number): Promise<GetBookingAndRoom> {
  const userBooking = await bookingRepository.findOneByUserId(userId);
  if(!userBooking) {
    throw notFoundError();
  }
  return exclude(userBooking, "createdAt", "updatedAt", "userId", "roomId") as GetBookingAndRoom;  
}

async function verifyUserBooking(userId: number): Promise<void> {
  const existentBooking = await bookingRepository.findOneByUserId(userId);

  if(existentBooking) {
    throw forbiddenError("User already booked a room.");
  }
}

async function verifyRoomCapacity(roomId: number): Promise<void> {
  const room = await roomRepository.findRoomById(roomId);
  if(!room) {
    throw notFoundError("Given room not found.");
  }

  if(room.Booking.length >= room.capacity) {
    throw forbiddenError("No vacancies avaliable for this room.");
  }
}

async function updateBooking(userId: number, bookingId: number, roomId: number): Promise<Booking> {
  await verifyBookingBelongsToUser(userId, bookingId);
  await verifyRoomCapacity(roomId);

  return bookingRepository.upsertBooking(userId, roomId, bookingId);
}

async function verifyBookingBelongsToUser(userId: number, bookingId: number): Promise<void> {
  const booking = await bookingRepository.findOneByUserId(userId);
  if(!booking || booking.id !== bookingId) {
    throw forbiddenError("Given booking doesn't belongs to user");
  }
}

const bookingService = {
  insertBooking,
  getUserBooking,
  updateBooking
};

export default bookingService;
