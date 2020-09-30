import fastify from "fastify";
import { sql } from "slonik";
import { createUpdateEventRoute, ConvertedUpdateEventBody } from "./route";
import { UpdateEventDatabase } from "./database/UpdateEventDatabase";
import { Jwt, Uuid } from "../utils";
import { AuthorizationDatabase } from "../utils/authorization/AuthorizationDatabase";
import { IncomingHttpHeaders } from "http";
import { NotFound } from "./database/errors";

jest.mock("../utils/authorization/AuthorizationDatabase", () => {
    return {
        AuthorizationDatabase: jest.fn()
    };
});
jest.mock("./database/UpdateEventDatabase", () => {
    return {
        UpdateEventDatabase: jest.fn()
    };
});
const MockedAuthorizationDatabase = AuthorizationDatabase as jest.Mock<
    AuthorizationDatabase
>;
const MockedUpdateEventDatabase = UpdateEventDatabase as jest.Mock<
    UpdateEventDatabase
>;

const methodAndRoute: { method: "PUT"; url: string } = {
    method: "PUT",
    url: "/events"
};

describe("PUT /events should return Unauthorized (401) if unable to identify user because", () => {
    const server = fastify();
    const updateEventDatabase = new MockedUpdateEventDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    const secret = "a secret";
    const uuid = new Uuid();
    const jwt = new Jwt(secret);
    const newEvent: ConvertedUpdateEventBody = {
        id: uuid.generateV4(),
        begin: new Date(),
        end: new Date(),
        description: "this is an event"
    };
    beforeAll(() => {
        server.route(
            createUpdateEventRoute({
                jwt,
                authorizationDatabase,
                updateEventDatabase,
                uuid
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
            },
            payload: newEvent
        });
        expect(response.statusCode).toBe(401);
    });
    test("authorization header is malformed", async () => {
        const token = await jwt.sign({});
        const response = await server.inject({
            ...methodAndRoute,
            headers: {
                authorization: token
            },
            payload: newEvent
        });
        expect(response.statusCode).toBe(401);
    });
    test("no authorization header", async () => {
        const response = await server.inject({
            ...methodAndRoute,
            payload: newEvent
        });
        expect(response.statusCode).toBe(401);
    });
});

test("PUT /events should return Not Found (404) if userId encoded in jwt is not registered", async () => {
    const server = fastify();
    const updateEventDatabase = new MockedUpdateEventDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(false)
    );
    const secret = "a secret";
    const jwt = new Jwt(secret);
    const uuid = new Uuid();
    server.route(
        createUpdateEventRoute({
            jwt,
            authorizationDatabase,
            updateEventDatabase,
            uuid
        })
    );

    const inexistentUserId = "an uuid";
    const token = await jwt.sign({ userId: inexistentUserId });
    const newEvent: ConvertedUpdateEventBody = {
        id: uuid.generateV4(),
        begin: new Date(),
        end: new Date(),
        description: "this is an event"
    };
    const response = await server.inject({
        ...methodAndRoute,
        headers: {
            authorization: `Bearer ${token}`
        },
        payload: newEvent
    });
    expect(response.statusCode).toBe(404);
});

describe("PUT /events should", () => {
    const server = fastify();
    const updateEventDatabase = new MockedUpdateEventDatabase();
    updateEventDatabase.getOtherEventsWithSameOwner = jest.fn(() =>
        Promise.resolve([])
    );
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(true)
    );
    const secret = "a secret";
    const uuid = new Uuid();
    const jwt = new Jwt(secret);
    const existingUserId = uuid.generateV4();
    const updatedEvent: ConvertedUpdateEventBody = {
        id: uuid.generateV4(),
        begin: new Date(),
        end: new Date(Date.now() + 1000),
        description: "this is description was updated"
    };
    let headers: IncomingHttpHeaders;
    let token: string;
    beforeAll(async () => {
        token = await jwt.sign({ userId: existingUserId });
        headers = {
            authorization: `Bearer ${token}`
        };
        server.route(
            createUpdateEventRoute({
                jwt,
                authorizationDatabase,
                updateEventDatabase,
                uuid
            })
        );
    });
    afterAll(async () => {
        await server.close();
    });
    test("return Created (201) when event update is successful", async () => {
        const mockedUpdateEvent = jest.fn(
            (eventInformation: ConvertedUpdateEventBody, creatorId: string) =>
                Promise.resolve()
        );
        updateEventDatabase.updateEvent = mockedUpdateEvent;
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: updatedEvent
        });
        expect(response.statusCode).toBe(201);
        expect(mockedUpdateEvent.mock.calls.length).toBe(1);
        expect(mockedUpdateEvent.mock.calls[0][0].id).toBe(updatedEvent.id);
        expect(mockedUpdateEvent.mock.calls[0][1]).toBe(existingUserId);
    });
    test("return Not Found (404) when trying to update inexistent event", async () => {
        const mockedUpdateEvent = jest.fn(
            (eventInformation: ConvertedUpdateEventBody, creatorId: string) => {
                throw new NotFound();
            }
        );
        updateEventDatabase.updateEvent = mockedUpdateEvent;
        const nonExistentEvent: ConvertedUpdateEventBody = {
            ...updatedEvent,
            id: uuid.generateV4()
        };
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: nonExistentEvent
        });
        expect(response.statusCode).toBe(404);
        expect(mockedUpdateEvent.mock.calls.length).toBe(1);
        expect(mockedUpdateEvent.mock.calls[0][0].id).toBe(nonExistentEvent.id);
        expect(mockedUpdateEvent.mock.calls[0][1]).toBe(existingUserId);
    });
});

describe("PUT /events should return Bad Request (400) if", () => {
    const server = fastify();
    const updateEventDatabase = new MockedUpdateEventDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(true)
    );
    const mockedUpdateEvent = jest.fn();
    updateEventDatabase.updateEvent = mockedUpdateEvent;
    const secret = "a secret";
    const uuid = new Uuid();
    const jwt = new Jwt(secret);
    const existingUserId = uuid.generateV4();
    let headers: IncomingHttpHeaders;
    let token: string;
    beforeAll(async () => {
        token = await jwt.sign({ userId: existingUserId });
        headers = {
            authorization: `Bearer ${token}`
        };
        server.route(
            createUpdateEventRoute({
                jwt,
                authorizationDatabase,
                updateEventDatabase,
                uuid
            })
        );
    });
    afterAll(async () => {
        await server.close();
    });
    test("new event.begin is greater than event.end", async () => {
        const endTime = new Date();
        const invalidEvent: ConvertedUpdateEventBody = {
            id: uuid.generateV4(),
            begin: new Date(endTime.getTime() + 1000),
            end: endTime,
            description: "this event is invalid"
        };
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: invalidEvent
        });
        expect(response.statusCode).toBe(400);
        expect(response.body).toMatch(/greater than or equal/);
        expect(mockedUpdateEvent.mock.calls.length).toBe(0);
    });
    test("new event.begin is the same as event.end", async () => {
        const time = new Date();
        const invalidEvent: ConvertedUpdateEventBody = {
            id: uuid.generateV4(),
            begin: time,
            end: time,
            description: "this event is invalid"
        };
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: invalidEvent
        });
        expect(response.statusCode).toBe(400);
        expect(response.body).toMatch(/greater than or equal/);
        expect(mockedUpdateEvent.mock.calls.length).toBe(0);
    });
    test("event id is not a valid uuid", async () => {
        const invalidEvent: ConvertedUpdateEventBody = {
            id: "not an uuid",
            begin: new Date(),
            end: new Date(Date.now() + 1000),
            description: "this event is invalid"
        };
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: invalidEvent
        });
        expect(response.statusCode).toBe(400);
        expect(response.body).toMatch(/Invalid event id/);
        expect(mockedUpdateEvent.mock.calls.length).toBe(0);
    });
    test("body.begin is in invalid format", async () => {
        const invalidEvent = {
            id: uuid.generateV4(),
            begin: "not an date",
            end: new Date(),
            description: "this event is invalid"
        };
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: invalidEvent
        });
        expect(response.statusCode).toBe(400);
        expect(response.json<{ message: string }>().message).toMatch(
            "body.begin should match format"
        );
        expect(mockedUpdateEvent.mock.calls.length).toBe(0);
    });
    test("body.end is in invalid format", async () => {
        const invalidEvent = {
            id: uuid.generateV4(),
            end: "not an date",
            begin: new Date(),
            description: "this event is invalid"
        };
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: invalidEvent
        });
        expect(response.statusCode).toBe(400);
        expect(response.json<{ message: string }>().message).toMatch(
            "body.end should match format"
        );
        expect(mockedUpdateEvent.mock.calls.length).toBe(0);
    });
});
