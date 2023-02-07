import { AuthenticatedRequest } from "@/middlewares";
import bookingService from "@/services/booking-service";
import { Response } from "express";
import httpStatus from "http-status";

export async function postBooking(req: AuthenticatedRequest, res: Response) {
  try{
    const { userId } = req;
    const roomId = Number(req.body.roomId);
    const booking = await bookingService.insertBooking(userId, roomId);
    return res.status(httpStatus.OK).send({ bookingId: booking.id });
  } catch (err) {
    if(err.name === "PaymentRequiredError") {
      return res.sendStatus(httpStatus.PAYMENT_REQUIRED).send(err.message);
    }
    if (err.name === "NotFoundError") {
      return res.status(httpStatus.NOT_FOUND).send(err.message);
    }

    if (err.name === "ForbiddenError") {
      return res.status(httpStatus.FORBIDDEN).send(err.message);
    }

    return res.sendStatus(httpStatus.INTERNAL_SERVER_ERROR);
  }
}
