import { sql } from "slonik";
import { IDatabase } from "../";

export interface IAuthorizationDatabase {
    checkIfUserIdIsRegistered: (userId: string) => Promise<boolean>;
}

export class AuthorizationDatabase implements IAuthorizationDatabase {
    constructor(private database: IDatabase) {}
    async checkIfUserIdIsRegistered(userId: string): Promise<boolean> {
        const result = await this.database.pool.maybeOne(
            sql`SELECT username FROM users WHERE id=${userId}`
        );
        return result ? Promise.resolve(true) : Promise.resolve(false);
    }
}
