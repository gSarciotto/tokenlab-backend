import { sql, UniqueIntegrityConstraintViolationError } from "slonik";
import { UserCredentials } from "../../sharedResources";
import { IDatabase, IUuid } from "../../utils";
import { DuplicateUserError } from "./errors";

export interface ICreateUserDatabase {
    insertOne: (user: UserCredentials) => Promise<void>;
}

export class CreateUserDatabase implements ICreateUserDatabase {
    constructor(private database: IDatabase, private uuid: IUuid) {}
    async insertOne(user: UserCredentials): Promise<void> {
        const id = this.uuid.generateV4();
        try {
            await this.database.pool.any(
                sql`INSERT INTO users (id, username, password) VALUES (${id}, ${user.username}, ${user.password})`
            );
        } catch (err) {
            if (err instanceof UniqueIntegrityConstraintViolationError) {
                throw new DuplicateUserError();
            } else {
                console.log(err);
                throw new Error(
                    "Unexpected error when attempting to create user."
                );
            }
        }
    }
}
