import { Event } from "../sharedResources";

export type EventWithUsername = Pick<Event, "begin" | "end" | "description"> & {
    id: string;
    creatorUsername: string;
};
