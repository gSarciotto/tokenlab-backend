import { FastifyInstance } from "fastify";
import { CreateUserBodySchema } from "./CreateUser";

export function addRouteSharedSchemas(server: FastifyInstance): void {
    server.addSchema(CreateUserBodySchema);
}
