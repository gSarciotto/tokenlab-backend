import * as jwt from "jsonwebtoken";
import { Jwt } from "./jwt";

test("Jwt should throw when instantiated with empty secret", () => {
    expect(() => {
        new Jwt("");
    }).toThrow();
});

describe("Jwt.sign should", () => {
    test("create token with default life expetancy of 6 hours", async () => {
        const secret = "any secret";
        const payload = {
            foo: "bar"
        };
        const wrappedJwt = new Jwt(secret);
        const token = await wrappedJwt.sign(payload);
        const decodedToken = jwt.decode(token);
        expect((decodedToken as Record<string, unknown>).foo).toBe(payload.foo);
        const iat = (decodedToken as { iat: number }).iat;
        const exp = (decodedToken as { exp: number }).exp;
        const lifeExpetancyInSeconds = exp - iat;
        const secondsInHour = 3600;
        expect(lifeExpetancyInSeconds).toBe(6 * secondsInHour);
    });
});

describe("Jwt.verify should", () => {
    test("return the payload of a valid token", async () => {
        const secret = "any secret";
        const payload = { foo: "bar" };
        const wrappedJwt = new Jwt(secret);
        const token = await wrappedJwt.sign(payload);
        const decodedToken = await wrappedJwt.verify<
            typeof payload & { iat: number; exp: number }
        >(token);
        expect(decodedToken.foo).toBe(payload.foo);
    });
    test("throw when token has expired", async () => {
        const secret = "any secret";
        const payload = { foo: "bar" };
        const wrappedJwt = new Jwt(secret, "0ms");
        const token = await wrappedJwt.sign(payload);
        await expect(wrappedJwt.verify(token)).rejects.toBeInstanceOf(
            jwt.TokenExpiredError
        );
    });
});
