import { NotFoundError, sql } from "slonik";
import { IDatabase } from "../../utils";
import { NotFound } from "./errors";

export interface IDeleteEventDatabase {
    deleteOne: (eventId: string, creatorId: string) => Promise<void>;
}

export class DeleteEventDatabase implements IDeleteEventDatabase {
    constructor(private database: IDatabase) {}
    async deleteOne(eventId: string, creatorId: string): Promise<void> {
        try {
            await this.database.pool.one(
                sql`DELETE FROM events WHERE id=${eventId} AND creator_id=${creatorId} RETURNING *`
            );
        } catch (err) {
            if (err instanceof NotFoundError) {
                throw new NotFound();
            } else {
                throw err;
            }
        }
    }
}
