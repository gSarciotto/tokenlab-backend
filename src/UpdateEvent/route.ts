import { RouteOptions } from "fastify";
import { Event } from "../sharedResources";
import {
    getTokenPayloadFromAuthorizationHeader,
    IJwt,
    IAuthorizationDatabase,
    IUuid,
    doesEventOverlaps
} from "../utils";
import { NotFound } from "./database/errors";
import { IUpdateEventDatabase } from "./database/UpdateEventDatabase";

interface CreateUpdateEventRouteParams {
    uuid: IUuid;
    authorizationDatabase: IAuthorizationDatabase;
    jwt: IJwt;
    updateEventDatabase: IUpdateEventDatabase;
}

interface UpdateEventBody {
    id: string;
    begin: string;
    end: string;
    description: string;
}

export type ConvertedUpdateEventBody = Pick<
    Event,
    "begin" | "end" | "description"
> & {
    id: string;
};

export const createUpdateEventRoute = ({
    uuid,
    jwt,
    authorizationDatabase,
    updateEventDatabase
}: CreateUpdateEventRouteParams): RouteOptions => ({
    method: "PUT",
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
        const body = request.body as UpdateEventBody;
        const convertedBody: ConvertedUpdateEventBody = {
            id: body.id,
            begin: new Date(body.begin),
            end: new Date(body.end),
            description: body.description
        };
        if (!uuid.validate(convertedBody.id)) {
            await reply.status(400).send("Invalid event id");
            return;
        }
        if (convertedBody.begin.getTime() >= convertedBody.end.getTime()) {
            await reply
                .status(400)
                .send(
                    "Event beginning is greater than or equal to event ending"
                );
            return;
        }
        try {
            const otherEventsWithSameOwner = await updateEventDatabase.getOtherEventsWithSameOwner(
                decodedToken.userId
            );
            if (
                doesEventOverlaps(
                    { ...convertedBody, creatorId: decodedToken.userId },
                    otherEventsWithSameOwner
                )
            ) {
                await reply.status(409).send();
                return;
            }
            await updateEventDatabase.updateEvent(
                convertedBody,
                decodedToken.userId
            );
            await reply.status(201).send();
        } catch (err) {
            if (err instanceof NotFound) {
                await reply.status(404).send();
            } else {
                await reply.status(500).send("Unknown error at event update");
            }
        }
    },
    schema: {
        body: {
            type: "object",
            required: ["id", "begin", "end", "description"],
            properties: {
                id: {
                    type: "string"
                },
                begin: {
                    type: "string",
                    format: "date-time"
                },
                end: {
                    type: "string",
                    format: "date-time"
                },
                description: {
                    type: "string",
                    maxLength: 100
                }
            }
        }
    }
});
