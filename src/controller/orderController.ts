import { paymentDispatcher } from "@/dispatcher";
import { IOrderModel, OrderContent, OrderStatus, PaymentProvider, PaymentWay } from "@/model/order";
import { IProductModel } from "@/model/product";
import { transactionHandler, genUID } from "@/utils";
import { NextFunction, Request, Response } from "express";
import { ValidationChain, body, validationResult } from "express-validator";
import { Knex } from "knex";
import { isEmpty, pick } from "lodash";

interface createOrderRequestParams {
    paymentProvider: PaymentProvider;
    paymentWay: PaymentWay;
    contents: OrderContent[];
}

export interface IOrderController {
    createOrderValidator(): ValidationChain[];
    createOrder(
        req: Request<any, any, createOrderRequestParams, any>, res: Response, _next: NextFunction
    ): void;
    updateOrder(req: Request<any, any, any, any>, res: Response, _next: NextFunction): void;
}

export class OrderController implements IOrderController {
    private knexSql: Knex;
    private orderModel: IOrderModel;
    private productModel: IProductModel;

    public static createController({ knexSql, orderModel, productModel }: {
        knexSql: Knex;
        orderModel: IOrderModel;
        productModel: IProductModel;
    }) {
        return new OrderController({ knexSql, orderModel, productModel });
    }

    constructor({ knexSql, orderModel, productModel }: {
        knexSql: Knex;
        orderModel: IOrderModel;
        productModel: IProductModel;
    }){
        this.knexSql = knexSql;
        this.orderModel = orderModel;
        this.productModel = productModel;
    }

    public createOrderValidator = () => {
        const paymentProviderValidator = (value: any) => {
            return [PaymentProvider.ECPAY, PaymentProvider.PAYPAL].includes(value);
        };

        const paymentWayValidator = (value: any) => {
            return [PaymentWay.CVS, PaymentWay.PAYPAL].includes(value);
        };

        const contentValidator = (value: OrderContent[]) => {
            if(isEmpty(value)) return false;

            for(const product of value) {
                if ([product.productId, product.amount, product.price].some(
                    val => typeof val !== "number" && !val)
                ){
                    // console.log({
                    //     "productId": product.productId,
                    //     "amount": product.amount,
                    //     "price": product.price
                    // })
                    return false;
                }
            }

            return true;
        }

        return [
            // 設定驗證不同參數的內容是否合法
            body("paymentProvider", "Invalid payment provider").custom(
                paymentProviderValidator
            ),
            body("paymentWay", "Invalid payment way").custom(
                paymentWayValidator
            ),
            body("contents", "Invalid contents")
            .isArray()
            .custom(
                contentValidator
            )
        ]
    }

    public createOrder: IOrderController["createOrder"] = async (req, res, _next) => {
        let { paymentProvider, paymentWay, contents } = req.body;

        // console.log("~~ file: orderController.ts: paymentProvider, paymentWay, contents line 86 ~~ ",
        //     paymentProvider,
        //     paymentWay,
        //     contents
        // )

        // 1. 資料驗證 => 已經用express-validator，在router/order.ts中，以middleware處理掉了
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 2. 將資料寫進 Database
        // transaction 資料庫交易 
        try{
            await transactionHandler(this.knexSql, async (trx: Knex.Transaction) => {
                const results = await Promise.all(
                    contents.map(
                        async (product) => 
                            await this.productModel.preSell(
                                {
                                    id: product.productId,
                                    // Cannot find name 'pick'.
                                    ...pick(product, ["price", "amount"])
                                    // price: product.price,
                                    // amount: product.amount
                                }, 
                                trx
                            )
                    )
                );

    
                if(results.some((result) => !result)){
                    throw new Error("Cannot buy, because out of stuff.");
                }

                const totalPrice = contents.reduce(
                    (acc, product) => acc + product.price * product.amount, 
                    0
                );

                const uid = genUID();
                await this.orderModel.create({
                    id: uid,
	                total: totalPrice,			
	                createdAt: new Date(),			
                    updatedAt: new Date(),
                    paymentProvider,		
                    paymentWay,				
                    status:	OrderStatus.WAITING,			
                    contents
                }, trx);

                const products = await this.productModel.findByIds(
                    contents.map(product => product.productId));

                const contentInfos = contents.map(content => ({
                    name: (products?.find(p => p.id === content.productId))?.name || "", 
                    price: content.price
                }));
                // 金流串接
                const result = await paymentDispatcher({
                    paymentProvider,
                    paymentWay,
                    payload: {
                        billId: uid,
                        totalPrice,
                        desc: `create bill ${uid} with ${contents
                            .map(content => content.productId)
                            .join(",")}`,
                        returnUrl: `${process.env.END_POINT}/orders/update`,
                        details: contentInfos || []
                    }
                });

                // console.log("~file orderController.ts: result line 170~", result);
                res.json({ status: "success", data: result });
            });
        }
        catch (err) {
            res.status(500).json({ errors: err });
            throw err;
        }

        // 3. 金流 API 的串接 (ECPAY, PAYPAL)
        // TODO:

        // 4. 回傳 Database create success

    }

    public updateOrder: IOrderController["updateOrder"] = async (req, res, _next) => {
        // TODO:
        console.log("🚀 ~file: OrderController.ts ~ OrderController line 188 ~ req: ", 
            req.body);

            let merchantTradeNo = "";
            let tradeDate = "";

            if ("RtnCode" in req.body && "MerchantTradeNo" in req.body) {
                const { MerchantTradeNo, RtnCode, TradeDate } = req.body;
                if (RtnCode !== "1") res.status(500).send("0|Failed");

                merchantTradeNo = MerchantTradeNo;
                tradeDate = TradeDate;
            }

            try {
                // 從 order 中找出我們的訂單
                const order = await this.orderModel.findOne(merchantTradeNo);
                if (isEmpty(order)) res.status(500).send("0|Failed");

                if (order?.status !== OrderStatus.WAITING) 
                    res.status(500).send("0|Failed");

                // 更新 product 減少的商品
                const results = await Promise.all(
                    order!.contents.map(
                        async (product) => 
                            await this.productModel.updateAmount(
                                {
                                    id: product.productId,
                                    ...pick(product, ["price", "amount"])
                                }
                            )
                    )
                );

                if (results.some(result => !result)) return res.status(500).send("0|Failed");

                // 更新 order 狀態
                await this.orderModel.update(merchantTradeNo, {
                    status: OrderStatus.SUCCESS,
                    updatedAt: new Date(tradeDate)
                });

                res.status(200).send("1|OK");
            }
            catch (err: any) {
                console.error(err);
                res.status(500).send("0|Failed");
            }
    }
}