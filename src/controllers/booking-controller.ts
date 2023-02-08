import { AuthenticatedRequest, handleApplicationErrors } from "@/middlewares";
import bookingService from "@/services/booking-service";
import { Response } from "express";
import httpStatus from "http-status";

export async function postBooking(req: AuthenticatedRequest, res: Response) {
  try{
    const { userId } = req;
    const roomId = Number(req.body.roomId);
    const booking = await bookingService.insertBooking(userId, roomId);
    return res.status(httpStatus.CREATED).send({ bookingId: booking.id });
  } catch (err) {
    handleApplicationErrors(err, req, res);
  }
}

export async function getBooking(req: AuthenticatedRequest, res: Response) {
  try{
    const { userId } = req;
    const userBooking = await bookingService.getUserBooking(userId);

    res.status(httpStatus.OK).send(userBooking);
  } catch(err) {
    handleApplicationErrors(err, req, res);
  }
}
