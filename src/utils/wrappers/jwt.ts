import * as jwt from "jsonwebtoken";

export interface IJwt {
    sign: (payload: Record<string, unknown>) => Promise<string>;
    verify: <T extends { iat: number; exp: number }>(
        token: string
    ) => Promise<T>;
}

export class Jwt implements IJwt {
    private secret: string;
    constructor(secret: string, private expiresIn: string = "6h") {
        if (secret === "") {
            throw new Error("JWT secret shouldn't be empty string");
        }
        this.secret = secret;
    }
    sign(payload: Record<string, unknown>): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            jwt.sign(
                payload,
                this.secret,
                {
                    expiresIn: this.expiresIn
                },
                (err, token) => {
                    if (token) {
                        return resolve(token);
                    }
                    return reject(err);
                }
            );
        });
    }
    verify<T extends { iat: number; exp: number }>(token: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            jwt.verify(token, this.secret, (err, payload) => {
                if (payload) {
                    return resolve(payload as T);
                }
                return reject(err);
            });
        });
    }
}
