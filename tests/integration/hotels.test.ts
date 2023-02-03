import app, { init } from "@/app";
import {
  createEnrollmentWithAddress,
  createUser,
  createTicket,
  generateCreditCardData,
  createHotel,
  createTicketType,
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
    it("Should respond with status 404 if user doesn't have an enrollment", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
  
      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
  
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("Should respond with status 404 if user doesn't have a ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);
  
      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
  
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    describe("When user has enrollment and ticket", () => {
      it("Should respond with status 402 if ticket is remote", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeRemote = await createTicketType({ isRemote: true });
        const ticket = await createTicket(enrollment.id, ticketTypeRemote.id, TicketStatus.RESERVED);
        
        const body = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(body);
        
        const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
      });
  
      it("Should respond with status 402 if ticket doesn't includes hotel", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketTypeWithoutHotel = await createTicketType({ includesHotel: false });
        const ticket = await createTicket(enrollment.id, ticketTypeWithoutHotel.id, TicketStatus.RESERVED);
        
        const body = { ticketId: ticket.id, cardData: generateCreditCardData() };
        await server.post("/payments/process").set("Authorization", `Bearer ${token}`).send(body);
        
        const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
        
        expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
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
