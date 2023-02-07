import app, { init } from "@/app";
import {
  createEnrollmentWithAddress,
  createUser,
  createTicket,
  generateCreditCardData,
  createHotel,
  createTicketType,
  createRoom
} from "../factories";
import faker from "@faker-js/faker";
import httpStatus from "http-status";
import supertest from "supertest";
import { cleanDb, generateValidToken } from "../helpers";
import * as jwt from "jsonwebtoken";
import { TicketStatus } from "@prisma/client";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /hotels", () => {
  it("Should respond with status 401 if no token is given", async () => {
    const response = await server.get("/hotels");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("When token is valid", () => {
    it("Should respond with status 403 if user doesn't have an enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
  
      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
  
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("Should respond with status 403 if user doesn't have a ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);
  
      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
  
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    describe("When user has enrollment and ticket", () => {
      it("Should respond with status 403 if ticket is remote", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeRemote = await createTicketType({ isRemote: true });
        const ticket = await createTicket(enrollment.id, ticketTypeRemote.id, TicketStatus.RESERVED);
        
        const body = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(body);
        
        const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });
  
      it("Should respond with status 403 if ticket doesn't includes hotel", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeWithoutHotel = await createTicketType({ includesHotel: false });
        const ticket = await createTicket(enrollment.id, ticketTypeWithoutHotel.id, TicketStatus.RESERVED);
        
        const body = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(body);
        
        const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });
  
      it("Should respond with status 402 if ticket is not PAID", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
        await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
    
        const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
      });
  
      it("Should respond with status 200 hotel array if ticket is PAID ", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
        const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
        await createHotel();
        await createHotel();
  
        const body = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(body);
    
        const response =  await server.get("/hotels").set("Authorization", `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              name: expect.any(String),
              image: expect.any(String),
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            })
          ])
        );
      });
    });
  });
});

describe("GET /hotels/:hotelId", () => {
  it("Should respond with status 401 if no token is given", async () => {
    const hotel = await createHotel();
    const response = await server.get(`/hotels/${hotel.id}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();
    const hotel = await createHotel();

    const response = await server.get(`/hotels/${hotel.id}}`).set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    const hotel = await createHotel();

    const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  
  describe("When token is valid", () => {
    it("Should respond with status 403 if user doesn't have an enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const hotel = await createHotel();
      
      const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);
      
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    
    it("Should respond with status 403 if user doesn't have a ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);
      
      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
      
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    
    describe("When user has enrollment and ticket", () => {
      it("Should respond with status 400 if param is not a number", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeRemote = await createTicketType({ isRemote: true });
        const ticket = await createTicket(enrollment.id, ticketTypeRemote.id, TicketStatus.RESERVED);
        await createHotel();

        const body = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(body);
        
        const response = await server.get("/hotels/a").set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.BAD_REQUEST);
      });

      it("Should respond with status 403 if ticket is remote", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeRemote = await createTicketType({ isRemote: true });
        const ticket = await createTicket(enrollment.id, ticketTypeRemote.id, TicketStatus.RESERVED);
        const hotel = await createHotel();
        
        const body = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(body);
        
        const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });
  
      it("Should respond with status 403 if ticket doesn't includes hotel", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeWithoutHotel = await createTicketType({ includesHotel: false });
        const ticket = await createTicket(enrollment.id, ticketTypeWithoutHotel.id, TicketStatus.RESERVED);
        const hotel = await createHotel();
        
        const body = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(body);
        
        const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.FORBIDDEN);
      });
  
      it("Should respond with status 402 if ticket is not PAID", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
        await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
        const hotel = await createHotel();
    
        const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
      });
  
      it("Should respond with status 404 if hotel doesnt exists", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
        const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
        await createHotel();
  
        const body = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(body);
    
        const response =  await server.get("/hotels/0").set("Authorization", `Bearer ${token}`);
  
        expect(response.statusCode).toBe(httpStatus.NOT_FOUND);
      });   
      
      it("Should respond with status 200 and hotel if ticket is PAID", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeNotRemoteAndWithHotel = await createTicketType({ isRemote: false, includesHotel: true });
        const ticket = await createTicket(enrollment.id, ticketTypeNotRemoteAndWithHotel.id, TicketStatus.RESERVED);
        const hotel = await createHotel({ name: "hotel da massa" });
        await createRoom({ hotelId: hotel.id, name: "quarto bao" });
  
        const body = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(body);
    
        const response =  await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            image: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            Rooms: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(Number),
                name: expect.any(String),
                capacity: expect.any(Number),
                hotelId: expect.any(Number),
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              })
            ])
          })
        );
      });      
    });
  });
});
