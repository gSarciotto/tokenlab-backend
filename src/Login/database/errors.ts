export class UserNotFound extends Error {
    constructor() {
        super("There is no existing user with given username.");
    }
}
