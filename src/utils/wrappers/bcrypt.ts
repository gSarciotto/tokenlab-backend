import * as bcrypt from "bcrypt";

export interface IBcrypt {
    compare: (password: string, hash: string) => Promise<boolean>;
    hash: (playinPassword: string) => Promise<string>;
}

export class Bcrypt implements IBcrypt {
    constructor(private rounds: number = 10) {}
    compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
    hash(plainPassword: string): Promise<string> {
        return bcrypt.hash(plainPassword, this.rounds);
    }
}
