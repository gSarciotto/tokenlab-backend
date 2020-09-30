import { EventWithUsernameModel } from "./EventWithUsernameModel";
import { EventWithUsername } from "../EventWithUsername";

export function convertFromModel(
    model: EventWithUsernameModel
): EventWithUsername {
    return {
        id: model.id,
        creatorUsername: model.creator_username,
        begin: new Date(model.begin_time),
        end: new Date(model.end_time),
        description: model.description
    };
}
