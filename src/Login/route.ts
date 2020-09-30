import { RouteOptions } from "fastify";
import { UserCredentials } from "../sharedResources";
import { IBcrypt, IJwt } from "../utils";
import { UserNotFound } from "./database/errors";
import { ILoginDatabase } from "./database/LoginDatabase";

const invalidCredentialsMessage = "Invalid username or password";

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

export const createLoginRoute = (
    database: ILoginDatabase,
    bcrypt: IBcrypt,
    jwt: IJwt
): RouteOptions => ({
    method: "POST",
    url: "/login",
    handler: async function (request, reply) {
        const body = request.body as UserCredentials;
        let storedUserPasswordAndId: ThenArg<ReturnType<
            typeof database.getUserPasswordAndId
        >>;
        try {
            storedUserPasswordAndId = await database.getUserPasswordAndId(
                body.username
            );
        } catch (err) {
            if (err instanceof UserNotFound) {
                await reply
                    .status(404)
                    .send({ message: invalidCredentialsMessage });
            } else {
                await reply
                    .status(500)
                    .send({ message: "Unknown error at user login." });
            }
            return;
        }
        const isPasswordValid = await bcrypt.compare(
            body.password,
            storedUserPasswordAndId.password
        );
        if (!isPasswordValid) {
            await reply
                .status(404)
                .send({ message: invalidCredentialsMessage });
            return;
        }
        const token = await jwt.sign({ userId: storedUserPasswordAndId.id });
        await reply.status(201).send({ token });
    },
    schema: {
        body: { $ref: "CreateUserBody" }
    }
});
