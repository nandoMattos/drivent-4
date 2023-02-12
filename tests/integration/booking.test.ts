import app, { init } from "@/app";
import faker from "@faker-js/faker";
import httpStatus from "http-status";
import supertest from "supertest";
import { cleanDb, generateValidToken } from "../helpers";
import  jwt from "jsonwebtoken";
import { 
  createEnrollmentWithAddress, 
  createHotel, 
  createRoom, 
  createTicket, 
  createTicketType, 
  createUser, 
  generateCreditCardData } from "../factories";
import { TicketStatus } from "@prisma/client";
import { createBooking } from "../factories/booking-factory";
import { prisma } from "@/config";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("POST /booking", () => {
  it("Should respond with status 401 if no token is given", async () => {
    const body = { roomId: faker.datatype.number() };
    const response = await server.post("/booking").send(body);
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();
    
    const body = { roomId: faker.datatype.number() };
    const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    
    const body = { roomId: faker.datatype.number() };
    const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("When token is valid", () => {
    it("Should respond with status 400 if given body is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      
      const body = { roomI: faker.datatype.string() };
      const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(httpStatus.BAD_REQUEST);
    });

    it("Should respond with status 403 if ser doesn't have an enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      
      const body = { roomId: faker.datatype.number() };
      const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("Should respond with status 403 if user doesn't have a ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);
      
      const body = { roomId: faker.datatype.number() };
      const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
  
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    describe("When user has enrollment and ticket", () => {
      it("Should respond with status 403 if ticket is remote", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeRemote = await createTicketType({ isRemote: true });
        const ticket = await createTicket(enrollment.id, ticketTypeRemote.id, TicketStatus.RESERVED);
        const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
        
        const body = { roomId: faker.datatype.number() };
        const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });
  
      it("Should respond with status 403 if ticket doesn't includes hotel", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeWithoutHotel = await createTicketType({ includesHotel: false });
        const ticket = await createTicket(enrollment.id, ticketTypeWithoutHotel.id, TicketStatus.RESERVED);
        const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
        
        const body = { roomId: faker.datatype.number() };
        const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });
  
      it("Should respond with status 402 if ticket is not PAID", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
        await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
        
        const body = { roomId: faker.datatype.number() };
        const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
      });

      describe("When ticket is PAID", () => {
        it("Should respond with 403 if user already booked a room", async () => {
          const user = await createUser();
          const token = await generateValidToken(user);
          const enrollment = await createEnrollmentWithAddress(user);
          const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
          const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
          const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
          await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
          const hotel = await createHotel();
          const room = await createRoom({ hotelId: hotel.id });
          await createBooking(user.id, room.id);
          
          const body = { roomId: faker.datatype.number() };
          const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
  
          expect(response.statusCode).toBe(httpStatus.FORBIDDEN);
        });

        it("Should respod with 404 if given room doesn't exists", async () => {
          const user = await createUser();
          const token = await generateValidToken(user);
          const enrollment = await createEnrollmentWithAddress(user);
          const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
          const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
          const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
          await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
          const hotel = await createHotel();
          await createRoom({ hotelId: hotel.id });
          
          const body = { roomId: 0 };
          const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
  
          expect(response.statusCode).toBe(httpStatus.NOT_FOUND);
        });

        it("Should respod with 403 if room has no vacancies avaliable (1)", async () => {
          const user = await createUser();
          const token = await generateValidToken(user);
          const enrollment = await createEnrollmentWithAddress(user);
          const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
          const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
          const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
          await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
          const hotel = await createHotel();
          const room = await createRoom({ hotelId: hotel.id, capacity: 1 });
          const anotherUser = await createUser(); 
          await createBooking(anotherUser.id, room.id);
          const body = { roomId: room.id };
  
          const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
  
          expect(response.statusCode).toBe(httpStatus.FORBIDDEN);
        });

        it("Should respod with 403 if room has no vacancies avaliable (2)", async () => {
          const user = await createUser();
          const token = await generateValidToken(user);
          const enrollment = await createEnrollmentWithAddress(user);
          const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
          const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
          const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
          await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
          const hotel = await createHotel();
          const room = await createRoom({ hotelId: hotel.id, capacity: 3 });
          const anotherUser1 = await createUser(); 
          const anotherUser2 = await createUser(); 
          const anotherUser3 = await createUser(); 
          await createBooking(anotherUser1.id, room.id);
          await createBooking(anotherUser2.id, room.id);
          await createBooking(anotherUser3.id, room.id);
          const body = { roomId: room.id };
  
          const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
  
          expect(response.statusCode).toBe(httpStatus.FORBIDDEN);
        });

        it("Should respond with 201 and bookingId otherwise", async () => {
          const user = await createUser();
          const token = await generateValidToken(user);
          const enrollment = await createEnrollmentWithAddress(user);
          const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
          const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
          const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
          await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
          const hotel = await createHotel();
          const room = await createRoom({ hotelId: hotel.id });
          
          const body = { roomId: room.id };
          const response = await server.post("/booking").send(body).set("Authorization", `Bearer ${token}`);
  
          expect(response.statusCode).toBe(httpStatus.CREATED);
          expect(response.body).toEqual(
            expect.objectContaining({ bookingId: expect.any(Number) })
          );

          // side effect
          const booking = await prisma.booking.findFirst({ where: { id: response.body.bookingId } });
          expect(booking.userId).toBe(user.id);
          expect(booking.roomId).toBe(room.id);
        });
      });
    });
  });
});

describe("GET /booking", () => {
  it("Should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();
    
    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    
    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("When token is valid", () => {
    it("Should respnd with 404 if user doesn't have booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
      const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
      const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
      await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
      const hotel = await createHotel();
      await createRoom({ hotelId: hotel.id });

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(httpStatus.NOT_FOUND);
    });

    it("Should respond with 200 and booking if user has booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
      const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
      const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
      await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
      const hotel = await createHotel();
      const room = await createRoom({ hotelId: hotel.id });
      const booking = await createBooking(user.id, room.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(httpStatus.OK);
      expect(response.body).toStrictEqual({
        id: booking.id,
        Room: {
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          hotelId: room.hotelId,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString()
        }
      });
    });
  });
});

describe("PUT /booking/:bookingId", () => {
  it("Should respond with status 401 if no token is given", async () => {
    const body = { roomId: faker.datatype.number() };
    const bookingId = faker.datatype.number({ min: 1 });

    const response = await server.put(`/booking/${bookingId}`).send(body);
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();
    const bookingId = faker.datatype.number({ min: 1 });
    
    const body = { roomId: faker.datatype.number() };
    const response = await server.put(`/booking/${bookingId}`).send(body).set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    
    const body = { roomId: faker.datatype.number() };
    const bookingId = faker.datatype.number({ min: 1 });
    const response = await server.put(`/booking/${bookingId}`).send(body).set("Authorization", `Bearer ${token}`);
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("When token is valid", () => {
    it("Should respond with status 400 if given param is not a number", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      
      const body = { roomId: faker.datatype.number() };
      const response = await server.put("/booking/oie").send(body).set("Authorization", `Bearer ${token}`);
      
      expect(response.status).toBe(httpStatus.BAD_REQUEST);
    });

    it("Should respond with status 403 if user doesn't have booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
      const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
      const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
      await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
      const hotel = await createHotel();
      await createRoom({ hotelId: hotel.id });
      
      const body = { roomId: faker.datatype.number() };
      const bookingId = faker.datatype.number({ min: 1 });
      const response = await server.put(`/booking/${bookingId}`).send(body).set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(httpStatus.FORBIDDEN);
    });

    it("Should respond with status 403 given booking doesn't belong to user", async () => {
      const user = await createUser();
      const user2 = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const enrollment2 = await createEnrollmentWithAddress(user2);
      const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
      const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
      const ticket2 = await createTicket(enrollment2.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
      const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
      const paymentBody2 = { ticketId: ticket2.id, cardData: generateCreditCardData() };
      await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
      await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody2);
      const hotel = await createHotel();
      const room = await createRoom({ hotelId: hotel.id });
      await createBooking(user.id, room.id);
      const booking2 = await createBooking(user2.id, room.id);
      
      const body = { roomId: faker.datatype.number() };
      const bookingId = booking2.id;
      const response = await server.put(`/booking/${bookingId}`).send(body).set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(httpStatus.FORBIDDEN);
    });

    describe("When given bookingId is valid", () => {
      it("Should respond with status 404 if given roomId doesn't exists", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
        const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
        const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
        const hotel = await createHotel();
        const room = await createRoom({ hotelId: hotel.id });
        const booking = await createBooking(user.id, room.id);
        
        const body = { roomId: 0 };
        const bookingId = booking.id;
        const response = await server.put(`/booking/${bookingId}`).send(body).set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(httpStatus.NOT_FOUND);
      });
  
      it("Should respond with status 403 if given roomId has no vacancies avaliable", async () => {
        const user = await createUser();
        const user2 = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const enrollment2 = await createEnrollmentWithAddress(user2);
        const ticketTypeWithoutHotel = await createTicketType({ includesHotel: false });
        const ticket = await createTicket(enrollment.id, ticketTypeWithoutHotel.id, TicketStatus.RESERVED);
        const ticket2 = await createTicket(enrollment2.id, ticketTypeWithoutHotel.id, TicketStatus.RESERVED);
        const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
        const paymentBody2 = { ticketId: ticket2.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody2);
        const hotel = await createHotel();
        const room = await createRoom({ hotelId: hotel.id });
        const room2 = await createRoom({ hotelId: hotel.id, capacity: 1 }); 
        const booking = await createBooking(user.id, room.id);
        await createBooking(user2.id, room2.id);
        
        const body = { roomId: room2.id };
        const bookingId = booking.id;
        const response = await server.put(`/booking/${bookingId}`).send(body).set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });
  
      it("Should respond with status 200 and bookingId otherwise", async () => {
        const user = await createUser();
        const user2 = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const enrollment2 = await createEnrollmentWithAddress(user2);
        const ticketTypeWithoutHotel = await createTicketType({ includesHotel: false });
        const ticket = await createTicket(enrollment.id, ticketTypeWithoutHotel.id, TicketStatus.RESERVED);
        const ticket2 = await createTicket(enrollment2.id, ticketTypeWithoutHotel.id, TicketStatus.RESERVED);
        const paymentBody = { ticketId: ticket.id, cardData: generateCreditCardData() };
        const paymentBody2 = { ticketId: ticket2.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody);
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(paymentBody2);
        const hotel = await createHotel();
        const room = await createRoom({ hotelId: hotel.id });
        const room2 = await createRoom({ hotelId: hotel.id, capacity: 2 }); 
        const booking = await createBooking(user.id, room.id);
        await createBooking(user2.id, room2.id);
        
        const body = { roomId: room2.id };
        const bookingId = booking.id;
        const response = await server.put(`/booking/${bookingId}`).send(body).set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.OK);

        // side effects
        const bookingsRoom1 = await prisma.booking.findMany({ where: { roomId: room.id } });
        expect(bookingsRoom1).toHaveLength(0);

        const bookingsRoom2 = await prisma.booking.findMany({ where: { roomId: room2.id } });
        expect(bookingsRoom2).toHaveLength(2);
      });
    });
  });
});
