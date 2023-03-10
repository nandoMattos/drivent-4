import { getBooking, postBooking, putBooking } from "@/controllers/booking-controller";
import { authenticateToken, validateBody } from "@/middlewares";
import { bookingSchema } from "@/schemas";
import { Router } from "express";

const bookingRouter = Router();

bookingRouter.
  all("/*", authenticateToken).
  post("/", validateBody(bookingSchema), postBooking).
  get("/", getBooking).
  put("/:bookingId", validateBody(bookingSchema), putBooking);

export { bookingRouter };
