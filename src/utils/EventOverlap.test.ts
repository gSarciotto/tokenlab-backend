import { Event } from "../sharedResources";

export function doesEventOverlaps(
    newEvent: Event,
    otherEvents: Event[]
): boolean {
    for (const event of otherEvents) {
        if (doesTwoEventsOverlaps(newEvent, event)) {
            return true;
        }
    }
    return false;
}
function doesTwoEventsOverlaps(firstEvent: Event, secondEvent: Event): boolean {
    const firstEventBegin = firstEvent.begin.getTime();
    const firstEventEnd = firstEvent.end.getTime();
    const secondEventBegin = secondEvent.begin.getTime();
    const secondEventEnd = secondEvent.end.getTime();

    const doesFirstEventStartsInsideSecondEvent =
        secondEventBegin <= firstEventBegin && firstEventBegin < secondEventEnd;
    const doesFirstEventEndsInsideSecondEvent =
        secondEventBegin < firstEventEnd && firstEventEnd <= secondEventEnd;
    return (
        doesFirstEventStartsInsideSecondEvent ||
        doesFirstEventEndsInsideSecondEvent
    );
}
