import { ECpayAdapter } from "@/adapter/ecpay";
import { PaymentProvider, PaymentWay } from "@/model/order"
import dayjs from "dayjs";

export interface OrderDetail {
    name: string;
    price: number;
}

export interface PaymentPayload {
    billId: string;
    totalPrice: number;
    desc: string;
    details: OrderDetail[];
    returnUrl: string;
}

export const paymentDispatcher = async ({ 
    paymentProvider, paymentWay, payload 
}: {
    paymentProvider: PaymentProvider,
    paymentWay: PaymentWay,
    payload: PaymentPayload
}) => {
    const ecpay = new ECpayAdapter();

    if (paymentProvider === PaymentProvider.ECPAY) {
        if (paymentWay === PaymentWay.CVS) {
            const html = ecpay.createCVS({
                cvsParams: {
                    MerchantTradeNo: payload.billId,
                    MerchantTradeDate: dayjs(new Date()).format("YYYY/MM/DD HH:mm:ss"),
                    TotalAmount: String(payload.totalPrice),
                    TradeDesc: payload.desc,
                    ItemName: payload.details.map(content => `${content.name} x ${content.price}`).join("#"),
                    ReturnURL: payload.returnUrl
                }
            });

            return html;
        }
        else throw new Error("No suitable payment way.");
    }
    else if (paymentProvider === PaymentProvider.PAYPAL) {
        // TODO:
    }
}