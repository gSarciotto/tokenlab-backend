import { RouteOptions } from "fastify";
import { IBcrypt } from "../utils";
import { ICreateUserDatabase } from "./database/CreateUserDatabase";
import { DuplicateUserError } from "./database/errors";
import { UserCredentials } from "../sharedResources/UserCredentials";

export const createNewUserRoute = (
    database: ICreateUserDatabase,
    bcrypt: IBcrypt
): RouteOptions => ({
    method: "POST",
    url: "/users",
    handler: async function (request, reply) {
        const body = request.body as UserCredentials;
        const hashedPassword = await bcrypt.hash(body.password);
        try {
            await database.insertOne({
                username: body.username,
                password: hashedPassword
            });
            await reply.status(201).send();
        } catch (err) {
            if (err instanceof DuplicateUserError) {
                await reply.status(409).send(err);
            } else {
                await reply.status(500).send(err);
            }
        }
    },
    schema: {
        body: { $ref: "CreateUserBody#" }
    }
});

export const CreateUserBodySchema = {
    $id: "CreateUserBody",
    type: "object",
    required: ["username", "password"],
    properties: {
        username: {
            type: "string",
            minLength: 3,
            maxLength: 20
        },
        password: {
            type: "string",
            minLength: 8,
            maxLength: 64
        }
    }
};
