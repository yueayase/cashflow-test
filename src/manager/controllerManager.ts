import { IOrderController, OrderController } from "@/controller/orderController";
import { IProductController, ProductController } from "@/controller/productController";
import { ModelContext } from "@/manager/modelManager";
import { Knex } from "knex";

export interface ControllerContext {
    productController: IProductController;
    orderController: IOrderController;
}

export const controllerManager = ({ 
    knexSql, 
    modelCtx 
}: { 
    knexSql: Knex;
    modelCtx: ModelContext; 
}): ControllerContext => {
    const productController = ProductController.createController({
        productModel: modelCtx.productModel 
    });

    const orderController = OrderController.createController({
        knexSql,
        orderModel: modelCtx.orderModel,
        productModel: modelCtx.productModel
    });

    return { productController, orderController };
}