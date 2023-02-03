import { AuthenticatedRequest } from "@/middlewares";
import hotelsService from "@/services/hotels-service";
import { Response } from "express";
import httpStatus from "http-status";

export async function getAllHotels(req: AuthenticatedRequest, res: Response) {
  try{
    const { userId } = req;
    const hotels = await hotelsService.findAllHotels(userId);
    res.status(httpStatus.OK).send(hotels);
  } catch(err) {
    if(err.name === "PaymentRequiredError") {
      res.status(httpStatus.PAYMENT_REQUIRED).send(err.message);
    }

    if(err.name === "NotFoundError") {
      res.status(httpStatus.NOT_FOUND).send(err.message);
    }

    res.sendStatus(httpStatus.INTERNAL_SERVER_ERROR);
  }
}

export async function getHotelRooms(req: AuthenticatedRequest, res: Response) {
  try{
    const { userId } = req;
    const hotelId = req.params.hotelId as unknown as number;
    const hotel = await hotelsService.findHotelById(userId, hotelId);
    res.status(httpStatus.OK).send(hotel);
  } catch(err) {
    if(err.name === "PaymentRequiredError") {
      res.status(httpStatus.PAYMENT_REQUIRED).send(err.message);
    }
    if(err.name === "NotFoundError") {
      res.status(httpStatus.NOT_FOUND).send(err.message);
    }

    res.sendStatus(httpStatus.INTERNAL_SERVER_ERROR);
  }
}
