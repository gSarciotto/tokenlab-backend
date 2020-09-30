import fastify from "fastify";
import { createNewUserRoute } from "./route";
import { UserCredentials } from "../sharedResources";
import { Bcrypt } from "../utils";
import { CreateUserDatabase } from "./database/CreateUserDatabase";
import { DuplicateUserError } from "./database/errors";
import { addRouteSharedSchemas } from "../addRouteSharedSchemas";

jest.mock("../utils", () => {
    return {
        Bcrypt: jest.fn()
    };
});
jest.mock("./database/CreateUserDatabase", () => {
    return {
        CreateUserDatabase: jest.fn()
    };
});

interface ValidationErrorBody {
    message: string;
}

const MockedBcrypt = Bcrypt as jest.Mock<Bcrypt>;
const MockedCreateUserDatabase = CreateUserDatabase as jest.Mock<
    CreateUserDatabase
>;

const routeAndMethods: { method: "POST"; url: string } = {
    method: "POST",
    url: "/users"
};

describe("POST /users should", () => {
    const server = fastify();
    const mockedBcrypt = new MockedBcrypt();
    const mockedDatabase = new MockedCreateUserDatabase();
    const hashedPassword = "hashed password";
    const mockedBcryptHash = jest.fn((password: string) =>
        Promise.resolve(hashedPassword)
    );
    mockedBcrypt.hash = mockedBcryptHash;
    beforeAll(() => {
        addRouteSharedSchemas(server);
        server.route(createNewUserRoute(mockedDatabase, mockedBcrypt));
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await server.close();
    });
    test("return Created (201) in successful user creation", async () => {
        const mockedInsertOne = jest.fn((user: UserCredentials) =>
            Promise.resolve()
        );
        mockedDatabase.insertOne = mockedInsertOne;
        const validUser: UserCredentials = {
            username: "validUsername",
            password: "password"
        };
        const response = await server.inject({
            ...routeAndMethods,
            payload: validUser
        });
        expect(response.statusCode).toBe(201);
        expect(mockedBcryptHash.mock.calls.length).toBe(1);
        expect(mockedBcryptHash.mock.calls[0][0]).toBe(validUser.password);
        expect(mockedInsertOne.mock.calls.length).toBe(1);
        expect(mockedInsertOne.mock.calls[0][0]).toEqual({
            ...validUser,
            password: hashedPassword
        });
    });
    test("return Conflict (409) when trying to create an already existing user", async () => {
        const mockedInsertOne = jest.fn((user: UserCredentials) => {
            throw new DuplicateUserError();
        });
        mockedDatabase.insertOne = mockedInsertOne;
        const duplicateUser: UserCredentials = {
            username: "duplicate",
            password: "anyPassword"
        };
        const response = await server.inject({
            ...routeAndMethods,
            payload: duplicateUser
        });
        expect(response.statusCode).toBe(409);
        expect(mockedBcryptHash.mock.calls.length).toBe(1);
        expect(mockedInsertOne.mock.calls.length).toBe(1);
        expect(mockedInsertOne.mock.calls[0][0]).toEqual({
            ...duplicateUser,
            password: hashedPassword
        });
    });
    test("return Server Error (500) if any other error occurs", async () => {
        const mockedInsertOne = jest.fn(() => {
            throw new Error();
        });
        mockedDatabase.insertOne = mockedInsertOne;
        const user: UserCredentials = {
            username: "username",
            password: "password"
        };
        const response = await server.inject({
            ...routeAndMethods,
            payload: user
        });
        expect(response.statusCode).toBe(500);
    });
});

describe("POST /users should return Bad Request (400) if", () => {
    const server = fastify();
    const mockedBcrypt = new MockedBcrypt();
    const mockedDatabase = new MockedCreateUserDatabase();
    const baseUser: UserCredentials = {
        username: "username",
        password: "password"
    };
    beforeAll(() => {
        addRouteSharedSchemas(server);
        server.route(createNewUserRoute(mockedDatabase, mockedBcrypt));
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await server.close();
    });
    test("field username is missing in request body", async () => {
        const response = await server.inject({
            ...routeAndMethods,
            payload: { password: "password" }
        });
        expect(response.statusCode).toBe(400);
        const responseBody = response.json<ValidationErrorBody>();
        expect(responseBody.message).toMatch(
            /body should have required property 'username'/
        );
    });
    test("field password is missing in request body", async () => {
        const response = await server.inject({
            ...routeAndMethods,
            payload: { username: "username" }
        });
        expect(response.statusCode).toBe(400);
        const responseBody = response.json<ValidationErrorBody>();
        expect(responseBody.message).toMatch(
            /body should have required property 'password'/
        );
    });
    test("username is too short (<3)", async () => {
        const usernameShort: UserCredentials = {
            ...baseUser,
            username: "aa"
        };
        const response = await server.inject({
            ...routeAndMethods,
            payload: usernameShort
        });
        expect(response.statusCode).toBe(400);
        const responseBody = response.json<ValidationErrorBody>();
        expect(responseBody.message).toMatch(/username should NOT be shorter/);
    });
    test("username is too long (>20)", async () => {
        const usernameLong: UserCredentials = {
            ...baseUser,
            username: "a".repeat(21)
        };
        const response = await server.inject({
            ...routeAndMethods,
            payload: usernameLong
        });
        expect(response.statusCode).toBe(400);
        const responseBody = response.json<ValidationErrorBody>();
        expect(responseBody.message).toMatch(/username should NOT be longer/);
    });
    test("password is too short (<8)", async () => {
        const usernameShort: UserCredentials = {
            ...baseUser,
            password: "short"
        };
        const response = await server.inject({
            ...routeAndMethods,
            payload: usernameShort
        });
        expect(response.statusCode).toBe(400);
        const responseBody = response.json<ValidationErrorBody>();
        expect(responseBody.message).toMatch(/password should NOT be shorter/);
    });
    test("password is too long (>64)", async () => {
        const usernameShort: UserCredentials = {
            ...baseUser,
            password: "a".repeat(65)
        };
        const response = await server.inject({
            ...routeAndMethods,
            payload: usernameShort
        });
        expect(response.statusCode).toBe(400);
        const responseBody = response.json<ValidationErrorBody>();
        expect(responseBody.message).toMatch(/password should NOT be longer/);
    });
});
