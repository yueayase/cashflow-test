const serverDomain = "http://localhost:3000";

// Vue2
// var vue = new Vue({
//     el: "#app",
//     data() {
//         return {
//             serverDomain: "http://localhost:3000",
//             buyItems: {}, // {"id": "amount"}
//             products: []
//         };
//     },
//     async mounted() {
//         this.products = await fetch(`${serverDomain}/products/list`).then((res) => 
//             res.json()
//         );
//         console.log(" ~file index.js line 33~ mounted ~this.products", this.products);
//     },
//     methods: {
//         getItemDetailByBuyItems() {
//             return Object.entries(this.buyItems).map(([id, amount]) => ({
//                 productId: Number(id),
//                 price: this.products.find((product) => product.id === Number(id)).price,
//                 amount: Number(amount)
//             })); // [{productId: 1, price: 100, amount: 9}, {productId: 1, price: 100, amount: 15}]
//         },
//         async sendPayment(url, data) {
//             try {
//                 //console.log("~file index.js line 46~ sendPayment ~url", url, data);
//                 const result = await fetch(url, {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     cors: "no-cors",
//                     body: JSON.stringify(data)
//                 }).then((res) => {
//                     if (res.ok) return res.json();
//                     return res.json().then((json) => Promise.reject(json));
//                 });

//                 return result;
//             }
//             catch(e) {
//                 console.log("~file index.js line 59~ sendPayment ~e", e);
//                 throw new Error(e);
//             }
//         },
//         async ECPAY() {
//             if(!Object.keys(this.buyItems).length) return alert("沒有選項");
//             //console.log("~file index.js line 65~ this.buyItems", this.buyItems);
//             const items = this.getItemDetailByBuyItems();
//             //console.log("~file index.js line 67~ items", items);

//             const result = await this.sendPayment(`${this.serverDomain}/orders/create`, {
//                 paymentProvider: "ECPAY",
//                 paymentWay: "CVS",
//                 contents: items
//             });

//             console.log("~file index.js line 75~ result", result);
//         }
//     }
// });

// Vue3
// See: https://book.vue.tw/CH1/1-7-lifecycle.html
const app = Vue.createApp({
    data() {
        return {
            ecpayHtml: "",
            serverDomain: "http://localhost:3000",
            buyItems: {}, // {"id": "amount"}
            products: []
        };
    },
    async mounted() {
        this.products = await fetch(`${serverDomain}/products/list`).then((res) => 
            res.json()
        );

        paypal.Buttons({
            // 使用 arrow function => 才可以得到global scope 的函數
            createOrder: async () => {
                // 串接我們自己的 server code
                const items = this.getItemDetailByBuyItems();

                const result = await this.sendPayment(
                    `${this.serverDomain}/orders/create`, 
                    {
                        paymentProvider: "PAYPAL",
                        paymentWay: "PAYPAL",
                        contents: items
                    }
                );

                console.log("🚀 ~ file index.js ~line 95 mounted ~ result:", result);
                console.log("🚀 ~ file index.js ~line 95 mounted ~ result2:", typeof result);
                console.log("🚀 ~ file index.js ~line 95 mounted ~ result3:", typeof result.data);
                return result.data;
            },
            onApprove: (data, actions) => {
                console.log("🚀 ~ file index.js ~line 101 mounted ~ data:", data);
                return actions.order.capture();
            },
            onError: (err) => {
                console.log("🚀 ~ file index.js ~line 105 mounted ~ err:", err);
            }
          }).render('#paypal-area');
        
        console.log(" ~file index.js line 109~ mounted ~this.products", this.products);
    },
    methods: {
        getItemDetailByBuyItems() {
            return Object.entries(this.buyItems).map(([id, amount]) => ({
                productId: Number(id),
                price: this.products.find((product) => product.id === Number(id)).price,
                amount: Number(amount)
            })); // [{productId: 1, price: 100, amount: 9}, {productId: 1, price: 100, amount: 15}]
        },
        async sendPayment(url, data) {
            try {
                //console.log("~file index.js line 90~ sendPayment ~url", url, data);
                const result = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    cors: "no-cors",
                    body: JSON.stringify(data)
                }).then((res) => {
                    if (res.ok) return res.json();
                    return res.json().then((json) => Promise.reject(json));
                });

                return result;
            }
            catch(e) {
                console.log("~file index.js line 135~ sendPayment ~e", e);
                throw new Error(e);
            }
        },
        async ECPAY() {
            if(!Object.keys(this.buyItems).length) return alert("沒有選項");
            //console.log("~file index.js line 110~ this.buyItems", this.buyItems);
            const items = this.getItemDetailByBuyItems();
            //console.log("~file index.js line 112~ items", items);

            const result = await this.sendPayment(`${this.serverDomain}/orders/create`, {
                paymentProvider: "ECPAY",
                paymentWay: "CVS",
                contents: items
            });

            const {data: html} = result;
            this.ecpayHtml = html;

            this.$nextTick(() => {
                document.getElementById("_form_aiochk").submit();
            });
            //console.log("~file index.js line 123~ ", this.ecpayHtml);
        }
    }
});

app.mount("#app");