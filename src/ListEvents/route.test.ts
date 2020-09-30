import fastify from "fastify";
import { createListEventsRoute } from "./route";
import { ListEventsDatabase } from "./database/ListEventsDatabase";
import { AuthorizationDatabase } from "../utils/authorization/AuthorizationDatabase";
import { Jwt } from "../utils";
import { IncomingHttpHeaders } from "http";
import { EventWithUsername } from "./EventWithUsername";

jest.mock("../utils/authorization/AuthorizationDatabase", () => {
    return {
        AuthorizationDatabase: jest.fn()
    };
});
jest.mock("./database/ListEventsDatabase", () => {
    return {
        ListEventsDatabase: jest.fn()
    };
});
const MockedAuthorizationDatabase = AuthorizationDatabase as jest.Mock<
    AuthorizationDatabase
>;
const MockedListEventsDatabase = ListEventsDatabase as jest.Mock<
    ListEventsDatabase
>;

const methodAndRoute: { method: "GET"; url: string } = {
    method: "GET",
    url: "/events"
};

describe("POST /events should return Unauthorized (401) if unable to identify user because", () => {
    const server = fastify();
    const listEventsDatabase = new MockedListEventsDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    const secret = "a secret";
    const jwt = new Jwt(secret);
    beforeAll(() => {
        server.route(
            createListEventsRoute({
                jwt,
                authorizationDatabase,
                listEventsDatabase
            })
        );
    });
    afterAll(async () => {
        await server.close();
    });
    test("token is expired", async () => {
        const jwt = new Jwt(secret, "0ms");
        const expiredToken = await jwt.sign({});
        const response = await server.inject({
            ...methodAndRoute,
            headers: {
                authorization: `Bearer ${expiredToken}`
            }
        });
        expect(response.statusCode).toBe(401);
    });
    test("authorization header is malformed", async () => {
        const token = await jwt.sign({});
        const response = await server.inject({
            ...methodAndRoute,
            headers: {
                authorization: token
            }
        });
        expect(response.statusCode).toBe(401);
    });
    test("no authorization header", async () => {
        const response = await server.inject({
            ...methodAndRoute
        });
        expect(response.statusCode).toBe(401);
    });
});

test("POST /events should return Not Found (404) if userId encoded in jwt is not registered", async () => {
    const server = fastify();
    const listEventsDatabase = new MockedListEventsDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(false)
    );
    const secret = "a secret";
    const jwt = new Jwt(secret);
    server.route(
        createListEventsRoute({
            jwt,
            authorizationDatabase,
            listEventsDatabase
        })
    );

    const inexistentUserId = "an uuid";
    const token = await jwt.sign({ userId: inexistentUserId });
    const response = await server.inject({
        ...methodAndRoute,
        headers: {
            authorization: `Bearer ${token}`
        }
    });
    expect(response.statusCode).toBe(404);
});

describe("GET /events should return Ok (200) and", () => {
    const server = fastify();
    const listEventsDatabase = new MockedListEventsDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(true)
    );
    const existingUserId = "an existing uuid";
    const secret = "a secret";
    const jwt = new Jwt(secret);
    let headers: IncomingHttpHeaders;
    beforeAll(async () => {
        const token = await jwt.sign({ userId: existingUserId });
        headers = {
            authorization: `Bearer ${token}`
        };
        server.route(
            createListEventsRoute({
                jwt,
                authorizationDatabase,
                listEventsDatabase
            })
        );
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await server.close();
    });
    test("empty events array", async () => {
        const mockedGetEvents = jest.fn((ownerId: string) =>
            Promise.resolve([] as EventWithUsername[])
        );
        listEventsDatabase.getEvents = mockedGetEvents;
        const response = await server.inject({
            ...methodAndRoute,
            headers
        });
        expect(response.statusCode).toBe(200);
        expect(
            response.json<{ events: EventWithUsername[] }>().events.length
        ).toBe(0);
        expect(mockedGetEvents.mock.calls[0][0]).toBe(existingUserId);
    });
    test("non-empty events array in ascending order of begin", async () => {
        const creatorUsername = "creator1";
        const event1: EventWithUsername = {
            id: "id1",
            creatorUsername,
            begin: new Date(),
            end: new Date(Date.now() + 1000),
            description: "this is event1"
        };
        const event2: EventWithUsername = {
            id: "id2",
            creatorUsername,
            begin: new Date(Date.now() + 500),
            end: new Date(Date.now() + 2500),
            description: "this is event2"
        };
        const mockedGetEvents = jest.fn((ownerId: string) =>
            Promise.resolve([event1, event2])
        );
        listEventsDatabase.getEvents = mockedGetEvents;
        const response = await server.inject({
            ...methodAndRoute,
            headers
        });
        expect(response.statusCode).toBe(200);
        const convertedPayload = response.json<{
            events: EventWithUsername[];
        }>();
        expect(convertedPayload.events[0].id).toBe(event1.id);
        expect(convertedPayload.events[0].creatorUsername).toBe(
            event1.creatorUsername
        );
        expect(convertedPayload.events[0].description).toBe(event1.description);
        expect(new Date(convertedPayload.events[0].begin).getTime()).toBe(
            event1.begin.getTime()
        );
        expect(new Date(convertedPayload.events[0].end).getTime()).toBe(
            event1.end.getTime()
        );
        expect(convertedPayload.events[1].id).toBe(event2.id);
        expect(convertedPayload.events[1].creatorUsername).toBe(
            event2.creatorUsername
        );
        expect(convertedPayload.events[1].description).toBe(event2.description);
        expect(new Date(convertedPayload.events[1].begin).getTime()).toBe(
            event2.begin.getTime()
        );
        expect(new Date(convertedPayload.events[1].end).getTime()).toBe(
            event2.end.getTime()
        );
        expect(mockedGetEvents.mock.calls[0][0]).toBe(existingUserId);
    });
});
