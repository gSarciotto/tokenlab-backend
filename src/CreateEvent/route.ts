import { RouteOptions } from "fastify";
import { Event } from "../sharedResources";
import {
    getTokenPayloadFromAuthorizationHeader,
    IAuthorizationDatabase,
    IJwt
} from "../utils";
import { ICreateEventDatabase } from "./database/CreateEventDatabase";
import { doesEventOverlaps } from "./utils";

export type CreateEventBody = Pick<Event, "begin" | "end" | "description">;

interface createNewEventRouteArguments {
    jwt: IJwt;
    authorizationDatabase: IAuthorizationDatabase;
    createEventDatabase: ICreateEventDatabase;
}

interface createNewEventRouteBody {
    begin: string;
    end: string;
    description: string;
}

export const createNewEventRoute = ({
    jwt,
    authorizationDatabase,
    createEventDatabase
}: createNewEventRouteArguments): RouteOptions => ({
    method: "POST",
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
        const body = request.body as createNewEventRouteBody;
        const convertedBody = {
            begin: new Date(body.begin),
            end: new Date(body.end),
            description: body.description
        };
        if (convertedBody.begin.getTime() >= convertedBody.end.getTime()) {
            await reply.status(400).send();
            return;
        }
        const newEvent: Event = {
            ...convertedBody,
            creatorId: decodedToken.userId
        };
        try {
            const otherEventsWithSameOwner = await createEventDatabase.getOtherEventsWithSameOwner(
                decodedToken.userId
            );
            if (doesEventOverlaps(newEvent, otherEventsWithSameOwner)) {
                await reply.status(409).send();
                return;
            }
            await createEventDatabase.insertOne(newEvent);
            await reply.status(201).send();
        } catch (err) {
            await reply.status(500).send();
        }
    },
    schema: {
        body: {
            type: "object",
            required: ["begin", "end", "description"],
            properties: {
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
