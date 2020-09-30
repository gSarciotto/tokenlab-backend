import {
    sql,
    SqlSqlTokenType,
    QueryResultRowType,
    NotFoundError
} from "slonik";
import { Event, EventModel } from "../../sharedResources";
import { convertEventModelToEvent, IDatabase, IUuid } from "../../utils";

export interface ICreateEventDatabase {
    insertOne: (event: Event) => Promise<void>;
    getOtherEventsWithSameOwner: (ownerId: string) => Promise<Event[]>;
}
const dateParam = (
    dateObj: Date
): SqlSqlTokenType<QueryResultRowType<string>> => {
    return sql`TO_TIMESTAMP(${dateObj.getTime()} / 1000.0)`;
};

export class CreateEventDatabase implements ICreateEventDatabase {
    constructor(private database: IDatabase, private uuid: IUuid) {}
    async insertOne(event: Event): Promise<void> {
        const id = event.id ? event.id : this.uuid.generateV4();
        await this.database.pool.any(
            sql`INSERT INTO events (id, creator_id, begin_time, end_time, description) VALUES (${id}, ${
                event.creatorId
            }, ${dateParam(event.begin)}, ${dateParam(event.end)}, ${
                event.description
            })`
        );
    }
    async getOtherEventsWithSameOwner(ownerId: string): Promise<Event[]> {
        let queryResult: EventModel[];
        try {
            queryResult = await this.database.pool.many(
                sql`SELECT * FROM events WHERE creator_id=${ownerId}`
            );
        } catch (err) {
            if (err instanceof NotFoundError) {
                queryResult = [];
            } else {
                throw err;
            }
        }
        const convertedResult: Event[] = queryResult.map(
            convertEventModelToEvent
        );
        return convertedResult;
    }
}
