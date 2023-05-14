import { v4 as uuid } from 'uuid/v4';
export abstract class BaseEntity {
    id: string;
    clientCreatedAt: Date;
    clientUpdatedAt: Date;
    serverCreatedAt: Date;
    serverUpdatedAt: Date;
    authorId: string;
    deleted: boolean;

    constructor(data?: Partial<BaseEntity>) {
        this.id = data?.id || uuid();
        this.clientCreatedAt = data?.clientCreatedAt || new Date();
        this.clientUpdatedAt = data?.clientUpdatedAt || new Date();
        this.serverCreatedAt = data?.serverCreatedAt || new Date(0);
        this.serverUpdatedAt = data?.serverUpdatedAt || new Date(0);
        this.authorId = data?.authorId || '';
        this.deleted = data?.deleted || false;
    }
}

export class MyPrompt extends BaseEntity {
    name: string;
    pinned: boolean;
    content: string;

    constructor(data?: Partial<MyPrompt>) {
        super(data);
        this.name = data?.name || '';
        this.pinned = data?.pinned || false;
        this.content = data?.content || '';
    }
}

export class MyChat extends BaseEntity {
    topic: string;
    pinned: boolean;

    constructor(data?: Partial<MyChat>) {
        super(data);
        this.topic = data?.topic || '';
        this.pinned = data?.pinned || false;
    }
}