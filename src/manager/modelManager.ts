import { Knex } from "knex";
import { IProductModel, ProductModel } from "@/model/product";
import { IOrderModel, OrderModel } from "@/model/order";

export interface ModelContext {
    productModel: IProductModel;
    orderModel: IOrderModel;
}

export const modelManager = ({ knexSql }: {knexSql: Knex}): ModelContext => {
    const productModel = ProductModel.createModel({ knexSql });
    const orderModel = OrderModel.createModel({ knexSql });

    return { productModel, orderModel };
}