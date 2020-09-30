import { sql } from "slonik";
import { config } from "dotenv";
import { Database, IDatabase } from "../../utils";
import { Uuid } from "../../utils/wrappers/uuid";
import { CreateUserDatabase } from "./CreateUserDatabase";
import { UserCredentials } from "../../sharedResources";
import { DuplicateUserError } from "./errors";

config();

jest.mock("../../utils/wrappers/uuid", () => {
    return {
        Uuid: jest.fn()
    };
});

const MockedUuid = Uuid as jest.Mock<Uuid>;

async function clearUsersTable(database: IDatabase): Promise<void> {
    await database.pool.query(sql`DELETE FROM users`);
}

describe("CreateUserDatabase.insertOne should", () => {
    const database = new Database(process.env.DB_CONNECTION);
    const uuid = new MockedUuid();
    const createUserDatabase = new CreateUserDatabase(database, uuid);
    const id = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
    const validUser: UserCredentials = {
        username: "username",
        password: "password"
    };
    beforeEach(async () => {
        await clearUsersTable(database);
    });
    afterAll(async () => {
        await clearUsersTable(database);
        await database.pool.end();
    });
    test("insert a valid user", async () => {
        const mockedUuidGenerate = jest.fn(() => id);
        uuid.generateV4 = mockedUuidGenerate;
        const expected = {
            ...validUser,
            id
        };
        await createUserDatabase.insertOne(validUser);
        const select = await database.pool.one<
            UserCredentials & { id: string }
        >(sql`SELECT * FROM users WHERE username=${validUser.username}`);
        expect(select).toEqual(expected);
        expect(mockedUuidGenerate.mock.calls.length).toBe(1);
    });
    test("throw if attempting to insert existing user", async () => {
        const anotherId = "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b";
        const mockedUuidGenerate = jest
            .fn()
            .mockReturnValueOnce(id)
            .mockReturnValueOnce(anotherId);
        uuid.generateV4 = mockedUuidGenerate;
        const userWithExistingUsername: UserCredentials = {
            username: validUser.username,
            password: "another password"
        };
        await createUserDatabase.insertOne(validUser);
        await expect(
            createUserDatabase.insertOne(userWithExistingUsername)
        ).rejects.toThrow(DuplicateUserError);
    });
});
