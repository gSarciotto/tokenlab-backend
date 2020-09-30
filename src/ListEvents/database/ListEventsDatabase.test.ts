import { sql } from "slonik";
import { config } from "dotenv";
import { ListEventsDatabase } from "./ListEventsDatabase";
import { CreateEventDatabase } from "../../CreateEvent/database/CreateEventDatabase";
import { Database, IDatabase, Uuid } from "../../utils";
import { Event, UserModel } from "../../sharedResources";

config();

async function clearTables(database: IDatabase) {
    await database.pool.query(sql`DELETE FROM events`);
    await database.pool.query(sql`DELETE FROM users`);
}

describe("ListEventsDatabase.getEvents should", () => {
    const database = new Database(process.env.DB_CONNECTION);
    const listEventsDatabase = new ListEventsDatabase(database);
    const uuid = new Uuid();
    const createEventDatabase = new CreateEventDatabase(database, uuid);
    const existingUser: UserModel = {
        id: uuid.generateV4(),
        username: "user1",
        password: "password"
    };
    const anotherUser: UserModel = {
        id: uuid.generateV4(),
        username: "user2",
        password: "password"
    };

    beforeEach(async () => {
        await clearTables(database);
        await database.pool.any(
            sql`INSERT INTO users (id, username, password) VALUES (${existingUser.id}, ${existingUser.username}, ${existingUser.password}), (${anotherUser.id}, ${anotherUser.username}, ${anotherUser.password})`
        );
    });
    afterAll(async () => {
        await database.pool.end();
    });
    test("return empty array if no event is found", async () => {
        const queryResult = await listEventsDatabase.getEvents(existingUser.id);
        expect(queryResult.length).toBe(0);
    });
    test("return array with many items in descending order by begin", async () => {
        const event1: Event = {
            id: uuid.generateV4(),
            creatorId: existingUser.id,
            begin: new Date(),
            end: new Date(Date.now() + 1000),
            description: "this is event1"
        };
        const event2: Event = {
            id: uuid.generateV4(),
            creatorId: existingUser.id,
            begin: new Date(event1.begin.getTime() + 5000),
            end: new Date(Date.now() + 10000),
            description: "this is event2"
        };
        const anotherEvent: Event = {
            id: uuid.generateV4(),
            creatorId: anotherUser.id,
            begin: new Date(),
            end: new Date(Date.now() + 2000),
            description: "this is another event"
        };
        await createEventDatabase.insertOne(event1);
        await createEventDatabase.insertOne(event2);
        await createEventDatabase.insertOne(anotherEvent);
        const queryResult = await listEventsDatabase.getEvents(existingUser.id);
        expect(queryResult.length).toBe(2);
        expect(queryResult[0].id).toBe(event2.id);
        expect(queryResult[1].id).toBe(event1.id);
        expect(queryResult[0].begin > queryResult[1].begin).toBe(true);
    });
});
