import { doesEventOverlaps } from "./utils";
import { Event } from "../sharedResources";

describe("doesEventOverlaps should return false if", () => {
    const existingUserId = "an id";
    const eventLifetime = 1000;
    const existingEvent: Event = {
        creatorId: existingUserId,
        begin: new Date(),
        end: new Date(Date.now() + eventLifetime)
    };
    test("event ends before existingEvent beginning", () => {
        const newEventEnd = new Date(
            existingEvent.begin.getTime() - eventLifetime
        );
        const newEvent: Event = {
            creatorId: existingUserId,
            begin: new Date(newEventEnd.getTime() - eventLifetime),
            end: newEventEnd
        };
        expect(doesEventOverlaps(newEvent, [existingEvent])).toBe(false);
    });
    test("event begins after existingEventEnds", () => {
        const newEventBegin = new Date(
            existingEvent.end.getTime() + eventLifetime
        );
        const newEvent: Event = {
            creatorId: existingUserId,
            begin: newEventBegin,
            end: new Date(newEventBegin.getTime() + eventLifetime)
        };
        expect(doesEventOverlaps(newEvent, [existingEvent])).toBe(false);
    });
    test("event ends just as existingEvent is starting", () => {
        const newEvent: Event = {
            creatorId: existingUserId,
            begin: new Date(existingEvent.begin.getTime() - eventLifetime),
            end: existingEvent.begin
        };
        expect(doesEventOverlaps(newEvent, [existingEvent])).toBe(false);
    });
    test("event begins just as existingEvent is ending", () => {
        const newEvent: Event = {
            creatorId: existingUserId,
            begin: existingEvent.end,
            end: new Date(existingEvent.end.getTime() + eventLifetime)
        };
        expect(doesEventOverlaps(newEvent, [existingEvent])).toBe(false);
    });
});

describe("doesEventOverlaps should return true if", () => {
    const existingUserId = "an id";
    const eventLifetime = 1000;
    const existingEvent: Event = {
        creatorId: existingUserId,
        begin: new Date(),
        end: new Date(Date.now() + eventLifetime)
    };
    test("event ends when existingEvent has already started but not ended", () => {
        const newEvent: Event = {
            creatorId: existingUserId,
            begin: new Date(existingEvent.begin.getTime() - eventLifetime),
            end: new Date(existingEvent.begin.getTime() + eventLifetime / 2)
        };
        expect(doesEventOverlaps(newEvent, [existingEvent])).toBe(true);
    });
    test("event begins when existingEvent has already started but not ended", () => {
        const newEvent: Event = {
            creatorId: existingUserId,
            begin: new Date(existingEvent.begin.getTime() + eventLifetime / 2),
            end: new Date(existingEvent.end.getTime() + eventLifetime)
        };
        expect(doesEventOverlaps(newEvent, [existingEvent])).toBe(true);
    });
    test("event being and ends while existingEvent is happening", () => {
        const newEvent: Event = {
            creatorId: existingUserId,
            begin: new Date(existingEvent.begin.getTime() + 1),
            end: new Date(existingEvent.end.getTime() - 1)
        };
        expect(doesEventOverlaps(newEvent, [existingEvent])).toBe(true);
    });
    test("event is being compared with itself", () => {
        expect(doesEventOverlaps(existingEvent, [existingEvent])).toBe(true);
    });
});
