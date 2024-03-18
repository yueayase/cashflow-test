import ECPayPayment from "./ECPAY_Payment_node_js";

interface CVS_INFO {
    StoreExpireDate: string;
    Desc_1: string;
    Desc_2: string;
    Desc_3: string;
    Desc_4: string;
    PaymentInfoURL: string;
}

interface CVS_PARAMS {
    MerchantTradeNo: string; //請帶20碼uid, ex: f0a0d7e9fae1bb72bc93
    MerchantTradeDate: string; //ex: 2017/02/13 15:45:30
    TotalAmount: string;
    TradeDesc: string;
    ItemName: string;
    ReturnURL: string;
}

interface CreateBillParams {
    cvsInfo?: CVS_INFO;    // may not use and want to be default (See line 70)
    cvsParams: CVS_PARAMS;
    inv_params?: {};
    client_redirect_url?: string;  
}

export interface IECpayAdapterOptions  {
    OperationMode: "Test" | "Production"; //Test or Production
    MercProfile: {
      MerchantID: string;
      HashKey: string;
      HashIV: string;
    };
    IgnorePayment: [
    ];
    IsProjectContractor: Boolean;
}

const defaultOptions: IECpayAdapterOptions = {
    OperationMode: "Test", //Test or Production
    MercProfile: {  // See: https://developers.ecpay.com.tw/?p=2856
      MerchantID: "3002607",
      HashKey: "pwFHCqoQZGmho4w6",
      HashIV: "EkRm7iFT261dpevs"
    },
    IgnorePayment: [
  //    "Credit",
  //    "WebATM",
  //    "ATM",
  //    "CVS",
  //    "BARCODE",
  //    "AndroidPay"
    ],
    IsProjectContractor: false
  };

export interface IECpayAdapter {
    createCVS(createBillParams: CreateBillParams): string;
}

export class ECpayAdapter implements IECpayAdapter {
    private ecpayInstance;

    constructor(options: IECpayAdapterOptions = defaultOptions) {
        this.ecpayInstance = new ECPayPayment(options);
    }

    createCVS = (createBillParams: CreateBillParams) => {
        const { cvsInfo = {
                StoreExpireDate: "",
                Desc_1: "",
                Desc_2: "",
                Desc_3: "",
                Desc_4: "",
                PaymentInfoURL: ""
            }, 
            cvsParams = {}, 
            inv_params, 
            client_redirect_url = ""
        } = createBillParams;

        const html = this.ecpayInstance.payment_client.aio_check_out_cvs(
            cvsInfo, 
            cvsParams, 
            inv_params, 
            client_redirect_url
        );

        //console.log(html);

        return html;
    }
}