import { Event } from "../../sharedResources";
import { EventModel } from "../../sharedResources/models/EventModel";

export function convertEventModelToEvent(model: EventModel): Event {
    return {
        id: model.id,
        creatorId: model.creator_id,
        begin: new Date(model.begin_time),
        end: new Date(model.end_time),
        description: model.description
    };
}
