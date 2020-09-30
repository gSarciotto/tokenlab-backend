import fastify from "fastify";
import { IncomingHttpHeaders } from "http";
import { CreateEventDatabase } from "./database/CreateEventDatabase";
import { createNewEventRoute, CreateEventBody } from "./route";
import { Jwt } from "../utils";
import { AuthorizationDatabase } from "../utils/authorization/AuthorizationDatabase";
import { Event } from "../sharedResources";

jest.mock("../utils/authorization/AuthorizationDatabase", () => {
    return {
        AuthorizationDatabase: jest.fn()
    };
});
jest.mock("./database/CreateEventDatabase", () => {
    return {
        CreateEventDatabase: jest.fn()
    };
});
const MockedAuthorizationDatabase = AuthorizationDatabase as jest.Mock<
    AuthorizationDatabase
>;
const MockedCreateEventDatabase = CreateEventDatabase as jest.Mock<
    CreateEventDatabase
>;

const methodAndRoute: { method: "POST"; url: string } = {
    method: "POST",
    url: "/events"
};

describe("POST /events should return Unauthorized (401) if unable to identify user because", () => {
    const server = fastify();
    const createEventDatabase = new MockedCreateEventDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    const secret = "a secret";
    const jwt = new Jwt(secret);
    const newEvent: CreateEventBody = {
        begin: new Date(),
        end: new Date(),
        description: "any description"
    };
    beforeAll(() => {
        server.route(
            createNewEventRoute({
                jwt,
                authorizationDatabase,
                createEventDatabase
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

test("POST /events should return Not Found (404) if userId encoded in jwt is not registered", async () => {
    const server = fastify();
    const createEventDatabase = new MockedCreateEventDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(false)
    );
    const secret = "a secret";
    const jwt = new Jwt(secret);
    server.route(
        createNewEventRoute({ jwt, authorizationDatabase, createEventDatabase })
    );

    const inexistentUserId = "an uuid";
    const token = await jwt.sign({ userId: inexistentUserId });
    const newEvent: CreateEventBody = {
        begin: new Date(),
        end: new Date(),
        description: "any description"
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

describe("POST /events should", () => {
    const server = fastify();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(true)
    );
    const createEventDatabase = new MockedCreateEventDatabase();
    const secret = "a secret";
    const jwt = new Jwt(secret);
    const existingUserId = "a registered uuid";
    let token: string;
    let headers: IncomingHttpHeaders;
    beforeAll(async () => {
        token = await jwt.sign({ userId: existingUserId });
        headers = {
            authorization: `Bearer ${token}`
        };
        server.route(
            createNewEventRoute({
                jwt,
                authorizationDatabase,
                createEventDatabase
            })
        );
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await server.close();
    });
    test("return Created (201) when successful in creating a new event when there is no other event with same owner", async () => {
        const mockedInsertOne = jest.fn((event: Event) => Promise.resolve());
        const mockedGetOtherEventsWithSameOwner = jest.fn((ownerId: string) =>
            Promise.resolve([])
        );
        createEventDatabase.insertOne = mockedInsertOne;
        createEventDatabase.getOtherEventsWithSameOwner = mockedGetOtherEventsWithSameOwner;
        const newEvent: CreateEventBody = {
            begin: new Date(),
            end: new Date(Date.now() + 1000),
            description: "any description"
        };
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: newEvent
        });
        expect(response.statusCode).toBe(201);
        //cant utilize .toEqual because another instance is created of Date inside the route (because of serialization).
        expect(mockedInsertOne.mock.calls.length).toBe(1);
        expect(mockedInsertOne.mock.calls[0][0].begin.getTime()).toBe(
            newEvent.begin.getTime()
        );
        expect(mockedInsertOne.mock.calls[0][0].end.getTime()).toBe(
            newEvent.end.getTime()
        );
        expect(mockedInsertOne.mock.calls[0][0].creatorId).toBe(existingUserId);
        expect(mockedInsertOne.mock.calls[0][0].description).toBe(
            newEvent.description
        );
    });
    test("return Created (201) when trying to create a new event when there is another event with same owner but no overlaps", async () => {
        const mockedInsertOne = jest.fn((event: Event) => Promise.resolve());

        createEventDatabase.insertOne = mockedInsertOne;
        const newEvent: CreateEventBody = {
            begin: new Date(),
            end: new Date(Date.now() + 1000),
            description: "any description"
        };
        const mockedGetOtherEventsWithSameOwner = jest.fn((ownerId: string) =>
            Promise.resolve([
                {
                    creatorId: existingUserId,
                    begin: new Date(newEvent.begin.getTime() - 1000),
                    end: new Date(newEvent.begin.getTime() - 500),
                    description: "this is another description"
                }
            ])
        );
        createEventDatabase.getOtherEventsWithSameOwner = mockedGetOtherEventsWithSameOwner;
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: newEvent
        });
        expect(response.statusCode).toBe(201);
        //cant utilize .toEqual because another instance is created of Date inside the route (because of serialization).
        expect(mockedInsertOne.mock.calls.length).toBe(1);
        expect(mockedInsertOne.mock.calls[0][0].begin.getTime()).toBe(
            newEvent.begin.getTime()
        );
        expect(mockedInsertOne.mock.calls[0][0].end.getTime()).toBe(
            newEvent.end.getTime()
        );
        expect(mockedInsertOne.mock.calls[0][0].creatorId).toBe(existingUserId);
        expect(mockedInsertOne.mock.calls[0][0].description).toBe(
            newEvent.description
        );
    });
    test("return Conflict (409) when trying to create a new event which overlaps with another event of same user", async () => {
        const mockedInsertOne = jest.fn();
        createEventDatabase.insertOne = mockedInsertOne;
        const newEventDuration = 1000;
        const newEvent: CreateEventBody = {
            begin: new Date(),
            end: new Date(Date.now() + newEventDuration),
            description: "any description"
        };
        const overlappedEvent: Event = {
            creatorId: existingUserId,
            begin: new Date(newEvent.begin.getTime() + newEventDuration / 2),
            end: new Date(newEvent.end.getTime() + newEventDuration),
            description: "this event overlaps"
        };
        const mockedGetOtherEventsWithSameOwner = jest.fn((ownerId: string) =>
            Promise.resolve([overlappedEvent])
        );
        createEventDatabase.getOtherEventsWithSameOwner = mockedGetOtherEventsWithSameOwner;
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: newEvent
        });
        expect(response.statusCode).toBe(409);
        expect(mockedGetOtherEventsWithSameOwner.mock.calls.length).toBe(1);
        expect(mockedGetOtherEventsWithSameOwner.mock.calls[0][0]).toBe(
            existingUserId
        );
        expect(mockedInsertOne.mock.calls.length).toBe(0);
    });
});

describe("POST /events should return Bad Request(400) if", () => {
    const server = fastify();
    const createEventDatabase = new MockedCreateEventDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(true)
    );
    const mockedInsertOne = jest.fn();
    const mockedGetOtherEventsWithSameOwner = jest.fn();
    createEventDatabase.insertOne = mockedInsertOne;
    createEventDatabase.getOtherEventsWithSameOwner = mockedGetOtherEventsWithSameOwner;
    const secret = "a secret";
    const jwt = new Jwt(secret);
    const existingUserId = "a registered uuid";
    let token: string;
    let headers: IncomingHttpHeaders;
    beforeAll(async () => {
        token = await jwt.sign({ userId: existingUserId });
        headers = {
            authorization: `Bearer ${token}`
        };
        server.route(
            createNewEventRoute({
                jwt,
                authorizationDatabase,
                createEventDatabase
            })
        );
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await server.close();
    });

    test("event begins after it should have ended", async () => {
        const eventEnd = new Date();
        const invalidEvent: CreateEventBody = {
            begin: new Date(eventEnd.getTime() + 1000),
            end: eventEnd,
            description: "this event is invalid"
        };
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: invalidEvent
        });
        expect(response.statusCode).toBe(400);
        expect(mockedInsertOne.mock.calls.length).toBe(0);
        expect(mockedGetOtherEventsWithSameOwner.mock.calls.length).toBe(0);
    });
    test("event beginning and end are equal", async () => {
        const eventTime = new Date();
        const invalidEvent: CreateEventBody = {
            begin: eventTime,
            end: eventTime,
            description: "this event is invalid"
        };
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: invalidEvent
        });
        expect(response.statusCode).toBe(400);
        expect(mockedInsertOne.mock.calls.length).toBe(0);
        expect(mockedGetOtherEventsWithSameOwner.mock.calls.length).toBe(0);
    });
});
