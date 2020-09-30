import { EventModel } from "../../sharedResources";

export type EventWithUsernameModel = Pick<
    EventModel,
    "id" | "begin_time" | "end_time" | "description"
> & { creator_username: string };
