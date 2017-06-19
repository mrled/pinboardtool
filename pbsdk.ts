import debug = require('debug');
let debugLog = debug('pbsdk');

import { RequestOptions, QueryParameter, SimpleHttpsRequest, HttpsRequest } from "./shr";

export class PinboardData {
    public static boolean(input: string | number): boolean {
        if (input === 'yes' || input === 'true' || input === 1) {
            return true;
        } else if (input === 'no' || input === 'false' || input === 0) {
            return false;
        } else {
            throw `Unable to parse '${input}'`
        }
    }
    public static dateFormatter(date: Date): string {
        return date.toISOString();
    }
}

export class PinboardTag {
    public count: number;
    constructor(public name: string, count?: number) {
        if (count) { this.count = count; }
    }
}

export class PinboardPost {
    constructor(
        public href: string,
        public description: string,
        public extended: string,
        public meta: string,
        public hash: string,
        public time: Date,
        public shared: boolean,
        public toread: boolean,
        public tags: PinboardTag[] = []
    ) {}
    static fromObj(opts: any): PinboardPost {
        let post = new PinboardPost(
            opts.href,
            opts.description,
            opts.extended,
            opts.meta,
            opts.hash,
            new Date(opts.time),
            PinboardData.boolean(opts.shared),
            PinboardData.boolean(opts.toread))
        opts.tags.split(' ').forEach(tagName => post.tags.push(new PinboardTag(tagName)));
        return post;
    }

    public uiString(): string {
        let tagNames: string[] = [];
        this.tags.forEach(t => tagNames.push(t.name));

        let ret = "";
        ret += `----------------\n`
        ret += this.description ? `${this.description}\n` : "UNTITLED BOOKMARK\n";
        ret += `<${this.href}>\n`;
        ret += this.extended ? `${this.extended}\n` : "";
        ret += `bookmarked: ${PinboardData.dateFormatter(this.time)}\n`;
        ret += `public: ${this.shared}, toread: ${this.toread}\n`;
        ret += `tags: ${tagNames.join(' ')}\n`;
        ret += `----------------\n`

        return ret;
    }
}

export class PinboardPostCollection {
    constructor(
        public date: Date,
        public user: string,
        public posts: PinboardPost[] = []
    ) {}

    public uiString(): string {
        let ret = `PinboardPostCollection for user ${this.user} on ${PinboardData.dateFormatter(this.date)}\n`;
        ret += `================\n\n`
        this.posts.forEach(p => ret += `${p.uiString()}\n`);
        ret += `================\n`
        return ret;
    }

    public static fromHttpResponse(response: any): PinboardPostCollection {
        let collection = new PinboardPostCollection(new Date(response.date), response.user);
        response.posts.forEach(postObj => collection.posts.push(PinboardPost.fromObj(postObj)));
        debugLog(`Got a PostCollection with ${collection.posts.length} posts`);
        return collection;
    }
}

export class PinboardPostsEndpoint {
    public noun = "posts";
    public urlOpts: RequestOptions;
    constructor(
        baseUrlOpts: RequestOptions,
        private request: SimpleHttpsRequest = new HttpsRequest()
    ) {
        this.urlOpts = baseUrlOpts.clone();
        this.urlOpts.basePath.push(this.noun);
    }

    public update(): Promise<Date> {
        var opts = this.urlOpts.clone();
        opts.basePath.push('update');
        return this.request.req(opts).then(result => {
            debugLog(`Last update time: ${result.update_time}`);
            return new Date(result.update_time);
        });
    }

    public get(tag: string[] = [], date?: Date, url?: string, meta: Boolean = false): Promise<PinboardPostCollection> {
        if (tag.length > 3) {
            throw "Only three tags are supported for this request";
        }
        var opts = this.urlOpts.clone();
        opts.basePath.push('get');
        tag.forEach((t) => { opts.queryParams.push(new QueryParameter('tag', t)); });
        if (date) { opts.queryParams.push(new QueryParameter('dt', PinboardData.dateFormatter(date))); }
        if (url) { opts.queryParams.push(new QueryParameter('url', url)); }
        opts.queryParams.push(new QueryParameter('meta', meta ? "yes" : "no"));

        return this.request.req(opts)
            .then(result => PinboardPostCollection.fromHttpResponse(result));
    }

    public recent(tag: string[] = [], count?: number): Promise<PinboardPostCollection> {
        if (tag.length > 3) {
            throw "Only three tags are supported for this request";
        }
        if (count > 100 || count < 0) {
            throw `Invalid value for 'count': '${count}'. Must be between 0-100.`
        }
        var opts = this.urlOpts.clone();
        opts.basePath.push('recent');
        tag.forEach((t) => { opts.queryParams.push(new QueryParameter('tag', t)); });
        if (count) {
            opts.queryParams.push(new QueryParameter('count', String(count)));
        }
        return this.request.req(opts)
            .then(result => PinboardPostCollection.fromHttpResponse(result));
    }
}

export class PinboardTagsEndpoint {
    public noun = "tags";
    public urlOpts: RequestOptions;
    constructor(baseUrlOpts: RequestOptions, private request: SimpleHttpsRequest = new HttpsRequest()) {
        this.urlOpts = baseUrlOpts.clone();
        this.urlOpts.basePath.push(this.noun);
    }

    public get(): Promise<PinboardTag[]> {
        var opts = this.urlOpts.clone();
        opts.basePath.push('get');
        return this.request.req(opts).then(tagObj => {
            let tags: PinboardTag[] = [];
            for (var tagName in tagObj) {
                tags.push(new PinboardTag(tagName, tagObj[tagName]));
            }
            debugLog(`Got ${tags.length} tags`);
            return tags;
        });
    }

    public rename(oldName: string, newName: string): Promise<any> {
        var opts = this.urlOpts.clone();
        opts.basePath.push('rename');
        opts.queryParams.push(new QueryParameter('old', oldName));
        opts.queryParams.push(new QueryParameter('new', newName));
        return this.request.req(opts).then(result => {
            debugLog(`Got result: ${result}`);
            return result;
        });
    }
}

export class Pinboard {
    public posts: PinboardPostsEndpoint;
    public tags: PinboardTagsEndpoint;
    public baseUrlOpts = new RequestOptions({host: 'api.pinboard.in', basePath: ['v1']});

    constructor(apitoken: string) {
        this.baseUrlOpts.queryParams.push(
            new QueryParameter('auth_token', apitoken),
            new QueryParameter('format', 'json')
        );
        this.baseUrlOpts.parseJson = true;

        this.posts = new PinboardPostsEndpoint(this.baseUrlOpts);
        this.tags = new PinboardTagsEndpoint(this.baseUrlOpts);
    }
}
