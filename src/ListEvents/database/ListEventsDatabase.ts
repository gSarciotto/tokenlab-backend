import { sql, NotFoundError } from "slonik";
import { IDatabase } from "../../utils";
import { EventWithUsername } from "../EventWithUsername";
import { EventWithUsernameModel } from "./EventWithUsernameModel";
import { convertFromModel } from "./convertFromModelWithUsername";

export interface IListEventsDatabase {
    getEvents: (ownerId: string) => Promise<EventWithUsername[]>;
}

export class ListEventsDatabase implements IListEventsDatabase {
    constructor(private database: IDatabase) {}
    async getEvents(creatorId: string): Promise<EventWithUsername[]> {
        let queryResults: EventWithUsernameModel[];
        try {
            const joinQuery = sql`WITH users_and_events AS (SELECT events.id AS id, users.username, events.creator_id, events.begin_time, events.end_time, events.description FROM events INNER JOIN users ON users.id=events.creator_id WHERE users.id=${creatorId})`;
            queryResults = await this.database.pool.many(
                sql`${joinQuery} SELECT id, begin_time, end_time, username AS creator_username, description FROM users_and_events ORDER BY begin_time DESC`
            );
        } catch (err) {
            if (err instanceof NotFoundError) {
                queryResults = [];
            } else {
                throw err;
            }
        }
        const convertedResults = queryResults.map(convertFromModel);
        return convertedResults;
    }
}
