import { AuthenticatedRequest, handleApplicationErrors } from "@/middlewares";
import hotelsService from "@/services/hotels-service";
import { Response } from "express";
import httpStatus from "http-status";

export async function getAllHotels(req: AuthenticatedRequest, res: Response) {
  try{
    const { userId } = req;
    const hotels = await hotelsService.findAllHotels(userId);
    res.status(httpStatus.OK).send(hotels);
  } catch(err) {
    handleApplicationErrors(err, req, res);
  }
}

export async function getHotelRooms(req: AuthenticatedRequest, res: Response) {
  try{
    const { userId } = req;
    const hotelId = Number(req.params.hotelId);
    if(isNaN(hotelId)) {
      return res.sendStatus(400);
    }
    const hotel = await hotelsService.findHotelById(userId, hotelId);
    res.status(httpStatus.OK).send(hotel);
  } catch(err) {
    handleApplicationErrors(err, req, res);
  }
}
