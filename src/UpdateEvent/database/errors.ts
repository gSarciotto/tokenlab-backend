export class NotFound extends Error {
    constructor() {
        super("Unable to find resource to be updated.");
    }
}
