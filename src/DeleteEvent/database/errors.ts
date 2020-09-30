export class NotFound extends Error {
    constructor() {
        super("No event exists with given id and creatorId");
    }
}
