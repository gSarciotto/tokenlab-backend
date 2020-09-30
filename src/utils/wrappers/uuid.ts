import * as uuid from "uuid";

export interface IUuid {
    generateV4: () => string;
    validate: (input: string) => boolean;
}

export class Uuid implements IUuid {
    generateV4(): string {
        return uuid.v4();
    }
    validate(input: string): boolean {
        return uuid.validate(input);
    }
}
