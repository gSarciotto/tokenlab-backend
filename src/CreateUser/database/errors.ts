export class DuplicateUserError extends Error {
    constructor() {
        super("There already exists a user with given username.");
    }
}
