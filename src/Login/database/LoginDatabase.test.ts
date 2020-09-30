import { sql } from "slonik";
import { config } from "dotenv";
import { LoginDatabase } from "./LoginDatabase";
import { Database, Uuid } from "../../utils";
import { UserModel } from "../../sharedResources";
import { UserNotFound } from "./errors";

config();

describe("LoginDatabase.getUserPasswordAndId should", () => {
    const database = new Database(process.env.DB_CONNECTION);
    const loginDatabase = new LoginDatabase(database);
    const uuid = new Uuid();
    const existingUser: UserModel = {
        id: uuid.generateV4(),
        username: "loginDatabase",
        password: "password"
    };
    beforeAll(async () => {
        await database.pool.query(
            sql`INSERT INTO users (id, username, password) VALUES (${existingUser.id}, ${existingUser.username}, ${existingUser.password})`
        );
    });
    afterAll(async () => {
        await database.pool.query(
            sql`DELETE FROM users WHERE id=${existingUser.id}`
        );
        await database.pool.end();
    });
    test("get password and id of an existing user", async () => {
        const expected = {
            id: existingUser.id,
            password: existingUser.password
        };
        const results = await loginDatabase.getUserPasswordAndId(
            existingUser.username
        );
        expect(results).toEqual(expected);
    });
    test("throw UserNotFound if username isn't registered", async () => {
        const inexistingUsername = "inexisting";
        await expect(
            loginDatabase.getUserPasswordAndId(inexistingUsername)
        ).rejects.toThrow(UserNotFound);
    });
});
