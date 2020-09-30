import {
    sql,
    SqlSqlTokenType,
    QueryResultRowType,
    NotFoundError
} from "slonik";
import { IDatabase } from "../../utils";
import { ConvertedUpdateEventBody } from "../route";
import { NotFound } from "./errors";

export interface IUpdateEventDatabase {
    updateEvent: (
        eventInformation: ConvertedUpdateEventBody,
        creatorId: string
    ) => Promise<void>;
}

const dateParam = (
    dateObj: Date
): SqlSqlTokenType<QueryResultRowType<string>> => {
    return sql`TO_TIMESTAMP(${dateObj.getTime()} / 1000.0)`;
};

export class UpdateEventDatabase implements IUpdateEventDatabase {
    constructor(private database: IDatabase) {}
    async updateEvent(
        eventInformation: ConvertedUpdateEventBody,
        creatorId: string
    ): Promise<void> {
        try {
            await this.database.pool.one(
                sql`UPDATE events SET begin_time=${dateParam(
                    eventInformation.begin
                )}, end_time=${dateParam(eventInformation.end)}, description=${
                    eventInformation.description
                } WHERE id=${
                    eventInformation.id
                } AND creator_id=${creatorId} RETURNING *`
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
