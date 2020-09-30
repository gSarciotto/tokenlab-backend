import { IJwt } from "../";

export class InvalidAuthorizationHeader extends Error {
    constructor(reason?: string) {
        super(reason);
    }
}

function getJwtToken(authorizationHeader: string | undefined): string {
    if (!authorizationHeader) {
        throw new InvalidAuthorizationHeader("No header.");
    }
    const splittedHeader = authorizationHeader.split(" ");
    if (splittedHeader.length !== 2) {
        throw new InvalidAuthorizationHeader("Malformed authorization header.");
    }
    if (splittedHeader[0] !== "Bearer") {
        throw new InvalidAuthorizationHeader("Malformed authorization header.");
    }
    return splittedHeader[1];
}

export function getTokenPayloadFromAuthorizationHeader<
    T extends Record<string, unknown>
>(
    authorizationHeader: string | undefined,
    jwt: IJwt
): Promise<T & { iat: number; exp: number }> {
    const token = getJwtToken(authorizationHeader);
    return jwt.verify<T & { iat: number; exp: number }>(token);
}
