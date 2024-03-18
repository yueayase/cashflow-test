import express from "express";
import { ControllerContext } from "@/manager/controllerManager";

export const mountOrderRouter = ({ 
    controllerCtx 
}: { controllerCtx: ControllerContext }) => {
    let router = express.Router();

    router.post("/create",
        // middleware 中介層
        controllerCtx.orderController.createOrderValidator(),
        // controller create order 正式的內容
        controllerCtx.orderController.createOrder);

    router.post("/update",
        controllerCtx.orderController.updateOrder
    );

    return router;
}