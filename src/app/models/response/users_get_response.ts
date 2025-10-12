export interface UsersGetRespone {
    user_id:        number;
    username:       string;
    email:          string;
    profile_image:  null | string;
    wallet_balance: string;
    role:           Role;
}

export enum Role {
    Admin = "admin",
    User = "user",
}
