export interface WalletTxnGetResponse {
    transaction_id: number;
    user_id:        number;
    type:           string;
    note:           string;
    amount:         string;
    date:           Date;
}
export{}