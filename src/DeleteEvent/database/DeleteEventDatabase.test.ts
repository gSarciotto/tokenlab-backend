import { config } from "dotenv";
import { sql } from "slonik";
import { Database, IDatabase, Uuid } from "../../utils";
import { DeleteEventDatabase } from "./DeleteEventDatabase";
import { NotFound } from "./errors";
import { Event } from "../../sharedResources";
import { CreateEventDatabase } from "../../CreateEvent/database/CreateEventDatabase";

config();

async function clearTables(database: IDatabase) {
    await database.pool.query(sql`DELETE FROM users`);
    await database.pool.query(sql`DELETE FROM events`);
}

describe("DeleteEventDatabase should", () => {
    const database = new Database(process.env.DB_CONNECTION);
    const deleteEventDatabase = new DeleteEventDatabase(database);
    const uuid = new Uuid();
    const existingUserId = uuid.generateV4();
    const existingEventId = uuid.generateV4();
    const existingEvent: Event = {
        id: existingEventId,
        creatorId: existingUserId,
        begin: new Date(),
        end: new Date(Date.now() + 1000),
        description: "this is an event"
    };
    const createEventDatabase = new CreateEventDatabase(database, uuid);
    beforeEach(async () => {
        await clearTables(database);
        const username = "deleteUser";
        const password = "password";
        await database.pool.query(
            sql`INSERT INTO users (id, username, password) VALUES (${existingUserId}, ${username}, ${password})`
        );
    });
    afterAll(async () => {
        await database.pool.end();
    });
    test("delete an event", async () => {
        const anotherEventId = uuid.generateV4();
        const anotherEvent: Event = {
            id: anotherEventId,
            creatorId: existingUserId,
            begin: new Date(),
            end: new Date(Date.now() + 52000),
            description: "this is another event"
        };
        await createEventDatabase.insertOne(existingEvent);
        await createEventDatabase.insertOne(anotherEvent);
        await deleteEventDatabase.deleteOne(anotherEventId, existingUserId);
        const eventsOfExistingUser = await createEventDatabase.getOtherEventsWithSameOwner(
            existingUserId
        );
        expect(eventsOfExistingUser.length).toBe(1);
        expect(eventsOfExistingUser[0].id).toBe(existingEventId);
    });
    test("throw NotFound if can't find event with given id", async () => {
        const inexistentEventId = uuid.generateV4();
        await expect(
            deleteEventDatabase.deleteOne(inexistentEventId, existingUserId)
        ).rejects.toThrow(NotFound);
    });
    test("throw NotFound if trying to delete event which user doesnt own", async () => {
        const anotherUserId = uuid.generateV4();
        await createEventDatabase.insertOne(existingEvent);
        await expect(
            deleteEventDatabase.deleteOne(existingEventId, anotherUserId)
        ).rejects.toThrow(NotFound);
    });
});
