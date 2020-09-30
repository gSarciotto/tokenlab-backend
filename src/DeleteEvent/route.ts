import { RouteOptions } from "fastify";
import {
    IAuthorizationDatabase,
    IJwt,
    IUuid,
    getTokenPayloadFromAuthorizationHeader
} from "../utils";
import { IDeleteEventDatabase } from "./database/DeleteEventDatabase";
import { NotFound } from "./database/errors";

interface CreateDeleteEventRouteParams {
    jwt: IJwt;
    deleteEventDatabase: IDeleteEventDatabase;
    uuid: IUuid;
    authorizationDatabase: IAuthorizationDatabase;
}

export const createDeleteEventRoute = ({
    jwt,
    deleteEventDatabase,
    uuid,
    authorizationDatabase
}: CreateDeleteEventRouteParams): RouteOptions => ({
    method: "DELETE",
    url: "/events",
    handler: async function (request, reply) {
        let decodedToken: { userId: string };
        try {
            decodedToken = await getTokenPayloadFromAuthorizationHeader<{
                userId: string;
            }>(request.headers.authorization, jwt);
        } catch (err) {
            await reply.status(401).send();
            return;
        }
        try {
            const isUuidRegistered = await authorizationDatabase.checkIfUserIdIsRegistered(
                decodedToken.userId
            );
            if (!isUuidRegistered) {
                await reply.status(404).send();
                return;
            }
        } catch (err) {
            await reply.status(500).send("Unknown error at authorization.");
            return;
        }
        const body = request.body as { eventId: string };
        if (!uuid.validate(body.eventId)) {
            await reply.status(400).send();
            return;
        }
        try {
            await deleteEventDatabase.deleteOne(
                body.eventId,
                decodedToken.userId
            );
            await reply.status(200).send();
        } catch (err) {
            if (err instanceof NotFound) {
                await reply.status(404).send();
            } else {
                await reply
                    .status(500)
                    .send("Unknown error when trying to delete event");
            }
        }
    },
    schema: {
        body: {
            type: "object",
            required: ["eventId"],
            properties: {
                eventId: {
                    type: "string"
                }
            }
        }
    }
});
