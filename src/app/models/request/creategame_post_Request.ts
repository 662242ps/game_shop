export interface CreateGamePotsRequest {
    name:         string;
    price:        number;
    description:  null;
    release_date: Date;
    image:        string;
    category_id:  number;
    created_by:   number;
}
export {};