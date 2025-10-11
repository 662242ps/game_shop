export interface GamesGetResponse {
    game_id:      number;
    name:         string;
    price:        string;
    description:  string;
    release_date: Date;
    image:        string;
    category_id:  number;
    created_by:   number;
}
export {};