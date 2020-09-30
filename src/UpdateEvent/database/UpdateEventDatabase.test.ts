import { sql } from "slonik";
import { config } from "dotenv";
import { UpdateEventDatabase } from "./UpdateEventDatabase";
import { NotFound } from "./errors";
import { Event } from "../../sharedResources";
import { Database, IDatabase, Uuid } from "../../utils";
import { CreateEventDatabase } from "../../CreateEvent/database/CreateEventDatabase";
import { ConvertedUpdateEventBody } from "../route";

config();

async function clearTables(database: IDatabase) {
    await database.pool.query(sql`DELETE FROM users`);
    await database.pool.query(sql`DELETE FROM events`);
}

describe("UpdateEventDatabase.updateEvent should", () => {
    const database = new Database(process.env.DB_CONNECTION);
    const updateEventDatabase = new UpdateEventDatabase(database);
    const uuid = new Uuid();
    const createEventDatabase = new CreateEventDatabase(database, uuid);
    const existingUserId = uuid.generateV4();
    const existingEventId = uuid.generateV4();
    const existingEvent: Event = {
        id: existingEventId,
        creatorId: existingUserId,
        begin: new Date(),
        end: new Date(Date.now() + 1000),
        description: "this is an existing event"
    };

    beforeEach(async () => {
        const username = "updateUser";
        const password = "password";
        await clearTables(database);
        await database.pool.query(
            sql`INSERT INTO users (id, username, password) VALUES (${existingUserId}, ${username}, ${password})`
        );
        await createEventDatabase.insertOne(existingEvent);
    });
    afterAll(async () => {
        await database.pool.end();
    });
    test("update an event", async () => {
        const updatedEvent: ConvertedUpdateEventBody = {
            id: existingEventId,
            begin: new Date(Date.now() + 5000),
            end: new Date(Date.now() + 10000),
            description: "this description was updated"
        };
        await updateEventDatabase.updateEvent(updatedEvent, existingUserId);
        const events = await createEventDatabase.getOtherEventsWithSameOwner(
            existingUserId
        );
        expect(events.length).toBe(1);
        expect(events[0].id).toBe(existingEvent.id);
        expect(events[0].creatorId).toBe(existingUserId);
        expect(events[0].begin.getTime()).toBe(updatedEvent.begin.getTime());
        expect(events[0].end.getTime()).toBe(updatedEvent.end.getTime());
        expect(events[0].description).toBe(updatedEvent.description);
    });
    test("throw NotFound when trying to update inexistent event", async () => {
        const nonExistentEvent: ConvertedUpdateEventBody = {
            id: uuid.generateV4(),
            begin: new Date(),
            end: new Date(),
            description: "this event doesnt exist"
        };
        await expect(
            updateEventDatabase.updateEvent(nonExistentEvent, existingUserId)
        ).rejects.toThrow(NotFound);
        const events = await createEventDatabase.getOtherEventsWithSameOwner(
            existingUserId
        );
        expect(events.length).toBe(1);
        expect(events[0].begin.getTime()).toBe(existingEvent.begin.getTime());
        expect(events[0].end.getTime()).toBe(existingEvent.end.getTime());
        expect(events[0].description).toBe(existingEvent.description);
    });
    test("throw NotFound when trying to update event that user doesn't own", async () => {
        const anotherUser = uuid.generateV4();
        const updatedEvent: ConvertedUpdateEventBody = {
            id: existingEventId,
            begin: new Date(),
            end: new Date(),
            description: "this description was updated"
        };
        await expect(
            updateEventDatabase.updateEvent(updatedEvent, anotherUser)
        ).rejects.toThrow(NotFound);
        const events = await createEventDatabase.getOtherEventsWithSameOwner(
            existingUserId
        );
        expect(events.length).toBe(1);
        expect(events[0].begin.getTime()).toBe(existingEvent.begin.getTime());
        expect(events[0].end.getTime()).toBe(existingEvent.end.getTime());
        expect(events[0].description).toBe(existingEvent.description);
    });
});
describe("UpdateEventDatabase.getOtherEventsWithSameOwner", () => {
    const database = new Database(process.env.DB_CONNECTION);
    const uuid = new Uuid();
    const createEventDatabase = new CreateEventDatabase(database, uuid);
    const existingUserId = uuid.generateV4();
    const event1: Event = {
        creatorId: existingUserId,
        begin: new Date(),
        end: new Date(Date.now() + 1000),
        description: "another event"
    };
    beforeAll(async () => {
        await clearTables(database);
    });
    beforeEach(async () => {
        const username = "eventOwner1";
        const password = "password";
        await clearTables(database);
        await database.pool.query(
            sql`INSERT INTO users (id, username, password) VALUES (${existingUserId}, ${username}, ${password})`
        );
    });
    afterAll(async () => {
        await database.pool.end();
    });
    test("return empty array if there is no event associated with user", async () => {
        const result = await createEventDatabase.getOtherEventsWithSameOwner(
            existingUserId
        );
        expect(result.length).toBe(0);
    });
    test("return array with one element when there is one event associated with user", async () => {
        const anotherUserId = uuid.generateV4();
        const anotherUserUsername = "anotherEventOwner";
        const anotherPassword = "password";
        const event2: Event = {
            creatorId: anotherUserId,
            begin: new Date(Date.now() + 10000),
            end: new Date(Date.now() + 200000),
            description: "this is an event of another user"
        };
        await database.pool.any(
            sql`INSERT INTO users (id, username, password) VALUES (${anotherUserId}, ${anotherUserUsername}, ${anotherPassword})`
        );
        await createEventDatabase.insertOne(event1);
        await createEventDatabase.insertOne(event2);
        const result = await createEventDatabase.getOtherEventsWithSameOwner(
            existingUserId
        );
        expect(result.length).toBe(1);
        expect(result[0].creatorId).toBe(event1.creatorId);
        expect(result[0].begin.getTime()).toBe(event1.begin.getTime());
        expect(result[0].end.getTime()).toBe(event1.end.getTime());
        expect(result[0].description).toBe(event1.description);
    });
    test("return array with many elements when there is more than one event associated with user", async () => {
        const anotherUserId = uuid.generateV4();
        const anotherUserUsername = "anotherEventOwner";
        const anotherPassword = "password";
        const event2: Event = {
            creatorId: anotherUserId,
            begin: new Date(Date.now() + 10000),
            end: new Date(Date.now() + 200000),
            description: "this is an event of another user"
        };
        const anotherEvent1: Event = {
            creatorId: existingUserId,
            begin: new Date(Date.now() + 10000),
            end: new Date(Date.now() + 300000),
            description: "this is another event"
        };
        await database.pool.any(
            sql`INSERT INTO users (id, username, password) VALUES (${anotherUserId}, ${anotherUserUsername}, ${anotherPassword})`
        );
        await createEventDatabase.insertOne(event1);
        await createEventDatabase.insertOne(event2);
        await createEventDatabase.insertOne(anotherEvent1);
        const result = await createEventDatabase.getOtherEventsWithSameOwner(
            existingUserId
        );
        expect(result.length).toBe(2);
        expect(result[0].creatorId).toBe(existingUserId);
        expect(result[0].begin.getTime()).toBe(event1.begin.getTime());
        expect(result[0].end.getTime()).toBe(event1.end.getTime());
        expect(result[0].description).toBe(event1.description);
        expect(result[1].creatorId).toBe(existingUserId);
        expect(result[1].begin.getTime()).toBe(anotherEvent1.begin.getTime());
        expect(result[1].end.getTime()).toBe(anotherEvent1.end.getTime());
        expect(result[1].description).toBe(anotherEvent1.description);
    });
});
