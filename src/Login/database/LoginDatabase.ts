import { NotFoundError, sql } from "slonik";
import { IDatabase } from "../../utils";
import { UserModel } from "../../sharedResources";
import { UserNotFound } from "./errors";

type UserIdAndPassword = Pick<UserModel, "id" | "password">;

export interface ILoginDatabase {
    getUserPasswordAndId: (username: string) => Promise<UserIdAndPassword>;
}

export class LoginDatabase implements ILoginDatabase {
    constructor(private database: IDatabase) {}
    async getUserPasswordAndId(username: string): Promise<UserIdAndPassword> {
        try {
            const results = await this.database.pool.one<UserIdAndPassword>(
                sql`SELECT id, password FROM users WHERE username=${username}`
            );
            return results;
        } catch (err) {
            if (err instanceof NotFoundError) {
                throw new UserNotFound();
            } else {
                throw err;
            }
        }
    }
}
