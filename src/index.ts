import fastify from "fastify";
import { config } from "dotenv";
import { addRouteSharedSchemas } from "./addRouteSharedSchemas";
import { createNewUserRoute, CreateUserDatabase } from "./CreateUser";
import { createNewEventRoute, CreateEventDatabase } from "./CreateEvent";
import { createDeleteEventRoute, DeleteEventDatabase } from "./DeleteEvent";
import { createListEventsRoute, ListEventsDatabase } from "./ListEvents";
import { createUpdateEventRoute, UpdateEventDatabase } from "./UpdateEvent";
import { createLoginRoute, LoginDatabase } from "./Login";
import { Bcrypt, Database, Uuid, Jwt, AuthorizationDatabase } from "./utils";
import fastifyCors from "fastify-cors";

config();

const server = fastify();
addRouteSharedSchemas(server);
void server.register(fastifyCors, {
    origin: true
});

const secret = process.env.JWT_SECRET;
if (!secret) {
    console.log("No JWT secret defined.");
    process.exit(1);
}
const uuid = new Uuid();
const bcrypt = new Bcrypt();
const jwt = new Jwt(secret);
const database = new Database(process.env.DB_CONNECTION);
const createUserDatabase = new CreateUserDatabase(database, uuid);
const loginDatabase = new LoginDatabase(database);
const createEventDatabase = new CreateEventDatabase(database, uuid);
const deleteEventDatabase = new DeleteEventDatabase(database);
const listEventsDatabase = new ListEventsDatabase(database);
const updateEventDatabase = new UpdateEventDatabase(database);
const authorizationDatabase = new AuthorizationDatabase(database);

server.route(createNewUserRoute(createUserDatabase, bcrypt));
server.route(createLoginRoute(loginDatabase, bcrypt, jwt));
server.route(
    createNewEventRoute({ jwt, createEventDatabase, authorizationDatabase })
);
server.route(
    createDeleteEventRoute({
        jwt,
        deleteEventDatabase,
        authorizationDatabase,
        uuid
    })
);
server.route(
    createListEventsRoute({ listEventsDatabase, jwt, authorizationDatabase })
);
server.route(
    createUpdateEventRoute({
        uuid,
        jwt,
        authorizationDatabase,
        updateEventDatabase
    })
);

server.listen(3000, function (err, address) {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    console.log(`server listening on ${address}`);
});
