import fastify from "fastify";
import { DeleteEventDatabase } from "./database/DeleteEventDatabase";
import { Jwt, Uuid } from "../utils";
import { AuthorizationDatabase } from "../utils/authorization/AuthorizationDatabase";
import { createDeleteEventRoute } from "./route";
import { IncomingHttpHeaders } from "http";
import { NotFound } from "./database/errors";

jest.mock("../utils/authorization/AuthorizationDatabase", () => {
    return {
        AuthorizationDatabase: jest.fn()
    };
});
jest.mock("./database/DeleteEventDatabase", () => {
    return {
        DeleteEventDatabase: jest.fn()
    };
});
const MockedAuthorizationDatabase = AuthorizationDatabase as jest.Mock<
    AuthorizationDatabase
>;
const MockedDeleteEventDatabase = DeleteEventDatabase as jest.Mock<
    DeleteEventDatabase
>;

const methodAndRoute: { method: "DELETE"; url: string } = {
    method: "DELETE",
    url: "/events"
};

describe("DELETE /events should return Unauthorized (401) if unable to identify user because", () => {
    const server = fastify();
    const deleteEventDatabase = new MockedDeleteEventDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    const secret = "a secret";
    const jwt = new Jwt(secret);
    const uuid = new Uuid();
    const payload = { eventId: "any id" };
    beforeAll(() => {
        server.route(
            createDeleteEventRoute({
                jwt,
                authorizationDatabase,
                deleteEventDatabase,
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
            payload
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
            payload
        });
        expect(response.statusCode).toBe(401);
    });
    test("no authorization header", async () => {
        const response = await server.inject({
            ...methodAndRoute,
            payload
        });
        expect(response.statusCode).toBe(401);
    });
});

test("DELETE /events should return Not Found (404) if userId encoded in jwt is not registered", async () => {
    const server = fastify();
    const deleteEventDatabase = new MockedDeleteEventDatabase();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(false)
    );
    const secret = "a secret";
    const jwt = new Jwt(secret);
    const uuid = new Uuid();
    const payload = { eventId: "any id" };
    server.route(
        createDeleteEventRoute({
            uuid,
            jwt,
            authorizationDatabase,
            deleteEventDatabase
        })
    );

    const inexistentUserId = "an uuid";
    const token = await jwt.sign({ userId: inexistentUserId });
    const response = await server.inject({
        ...methodAndRoute,
        headers: {
            authorization: `Bearer ${token}`
        },
        payload
    });
    expect(response.statusCode).toBe(404);
});

describe("DELETE /events should", () => {
    const server = fastify();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(true)
    );
    const deleteEventDatabase = new MockedDeleteEventDatabase();
    const secret = "a secret";
    const jwt = new Jwt(secret);
    const uuid = new Uuid();
    const existingEventId = uuid.generateV4();
    const existingUserId = uuid.generateV4();
    let headers: IncomingHttpHeaders;
    let token: string;
    beforeAll(async () => {
        token = await jwt.sign({ userId: existingUserId });
        headers = {
            authorization: `Bearer ${token}`
        };
        server.route(
            createDeleteEventRoute({
                jwt,
                authorizationDatabase,
                deleteEventDatabase,
                uuid
            })
        );
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await server.close();
    });
    test("return OK (200) when deletion of event is successful", async () => {
        const mockedDeleteOne = jest.fn((eventId: string, creatorId: string) =>
            Promise.resolve()
        );
        deleteEventDatabase.deleteOne = mockedDeleteOne;
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: { eventId: existingEventId }
        });
        expect(response.statusCode).toBe(200);
        expect(mockedDeleteOne.mock.calls.length).toBe(1);
        expect(mockedDeleteOne.mock.calls[0][0]).toBe(existingEventId);
        expect(mockedDeleteOne.mock.calls[0][1]).toBe(existingUserId);
    });
    test("return Not Found (404) if couldn't find event with given id and creatorId", async () => {
        const mockedDeleteOne = jest.fn(
            (eventId: string, creatorId: string) => {
                throw new NotFound();
            }
        );
        deleteEventDatabase.deleteOne = mockedDeleteOne;
        const inexistentEventId = uuid.generateV4();
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: { eventId: inexistentEventId }
        });
        expect(response.statusCode).toBe(404);
        expect(mockedDeleteOne.mock.calls.length).toBe(1);
        expect(mockedDeleteOne.mock.calls[0][0]).toBe(inexistentEventId);
        expect(mockedDeleteOne.mock.calls[0][1]).toBe(existingUserId);
    });
});

describe("DELETE /events should return Bad Request (400) if", () => {
    const server = fastify();
    const authorizationDatabase = new MockedAuthorizationDatabase();
    authorizationDatabase.checkIfUserIdIsRegistered = jest.fn(() =>
        Promise.resolve(true)
    );
    const deleteEventDatabase = new MockedDeleteEventDatabase();
    const secret = "a secret";
    const jwt = new Jwt(secret);
    const uuid = new Uuid();
    const existingUserId = uuid.generateV4();
    let headers: IncomingHttpHeaders;
    let token: string;
    beforeAll(async () => {
        token = await jwt.sign({ userId: existingUserId });
        headers = {
            authorization: `Bearer ${token}`
        };
        server.route(
            createDeleteEventRoute({
                jwt,
                authorizationDatabase,
                deleteEventDatabase,
                uuid
            })
        );
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await server.close();
    });
    test("return Bad Request (400) if eventId is not a valid Uuid", async () => {
        const mockedDeleteOne = jest.fn();
        deleteEventDatabase.deleteOne = mockedDeleteOne;
        const nonUuid = "not an uuid";
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: { eventId: nonUuid }
        });
        expect(response.statusCode).toBe(400);
        expect(mockedDeleteOne.mock.calls.length).toBe(0);
    });
    test("return Bad Request (400) if no eventId is provided or isn't a string", async () => {
        const response = await server.inject({
            ...methodAndRoute,
            headers,
            payload: {}
        });
        expect(response.statusCode).toBe(400);
        expect(response.json<{ message: string }>().message).toMatch(
            "body should have required property 'eventId"
        );
    });
});
