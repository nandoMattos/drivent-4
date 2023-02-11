import { prisma } from "@/config";
import { Enrollment, PrismaPromise, TicketStatus } from "@prisma/client";

async function findWithAddressByUserId(userId: number) {
  return prisma.enrollment.findFirst({
    where: { userId },
    include: {
      Address: true,
    },
  });
}

async function findById(enrollmentId: number) {
  return prisma.enrollment.findFirst({
    where: { id: enrollmentId }
  });
}

async function upsert(
  userId: number,
  createdEnrollment: CreateEnrollmentParams,
  updatedEnrollment: UpdateEnrollmentParams,
) {
  return prisma.enrollment.upsert({
    where: {
      userId,
    },
    create: createdEnrollment,
    update: updatedEnrollment,
  });
}

function getEnrollmentAndTicketByUserId(userId: number): PrismaPromise<EnrollmentAndTicket> {
  return prisma.enrollment.findFirst({
    where: { userId },
    include: { 
      Ticket: {
        select: {
          id: true,
          status: true,
        }
      }
    }
  });
}

export type CreateEnrollmentParams = Omit<Enrollment, "id" | "createdAt" | "updatedAt">;
export type UpdateEnrollmentParams = Omit<CreateEnrollmentParams, "userId">;
export type EnrollmentAndTicket = Enrollment & {
  Ticket: {
      id: number;
      status: TicketStatus;
  }[];
}

const enrollmentRepository = {
  findWithAddressByUserId,
  upsert,
  findById,
  getEnrollmentAndTicketByUserId
};

export default enrollmentRepository;
