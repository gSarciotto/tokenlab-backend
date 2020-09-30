import { RouteOptions } from "fastify";
import {
    getTokenPayloadFromAuthorizationHeader,
    IAuthorizationDatabase,
    IJwt
} from "../utils";
import { IListEventsDatabase } from "./database/ListEventsDatabase";

interface createListEventsRouteParams {
    listEventsDatabase: IListEventsDatabase;
    jwt: IJwt;
    authorizationDatabase: IAuthorizationDatabase;
}

export const createListEventsRoute = ({
    listEventsDatabase,
    jwt,
    authorizationDatabase
}: createListEventsRouteParams): RouteOptions => ({
    method: "GET",
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
        try {
            const events = await listEventsDatabase.getEvents(
                decodedToken.userId
            );
            await reply.status(200).send({ events });
        } catch (err) {
            console.log(err);
            await reply.status(500).send("Unknown error at event listing.");
        }
    }
});
