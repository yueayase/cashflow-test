import { Knex } from "knex";
import { Base, IBase } from "./base";

export enum PaymentProvider {
    ECPAY = "ECPAY",
    PAYPAL = "PAYPAL"
}

export enum PaymentWay {
    CVS = "CVS",
    CC = "CC",
    ATM = "ATM",
    PAYPAL = "PAYPAL"
}

export enum OrderStatus {
    WAITING = "WAITING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    CANCEL = "CANCEL"
}

export interface OrderContent {
    productId: number;
    amount: number;
    price: number;
}

export interface Order {
    id: string;
	total: number;		
	createdAt: Date;		
	updatedAt: Date;		
	paymentProvider: PaymentProvider;				
	paymentWay: PaymentWay;			
	status: OrderStatus;			
	contents: OrderContent[];
} 

export interface IOrderModel extends IBase<Order> {
    create(data: Order, trx?: Knex.Transaction): Promise<Order | null>;
}

export class OrderModel extends Base<Order> implements IOrderModel {
    tableName = "orders";

    schema = {
        id: "id",
        total: "total",
        createdAt: "created_at",
        updatedAt: "updated_at",
        paymentProvider: "payment_provider",
        paymentWay: "payment_way",
        status: "status",
        contents: "contents"
    };

    constructor( { knexSql, tableName }: { knexSql: Knex, tableName?: string }) {
        super({ knexSql, tableName });
    }

    static createModel = ({ 
        knexSql, 
        tableName }: {
        knexSql: Knex, 
        tableName?: string
    }) => {
        return new OrderModel({ knexSql, tableName });
    }
}