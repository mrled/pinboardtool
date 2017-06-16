import { RequestOptions, QueryParameter, SimpleHttpsRequest, HttpsRequest } from "./shr";

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
    static fromObj(opts: any) {
        let post = new PinboardPost(
            opts.href,
            opts.description,
            opts.extended,
            opts.meta,
            opts.hash,
            new Date(opts.time),
            opts.shared === 'yes' ? true : false,
            opts.toread === 'yes' ? true : false)
        opts.tags.split(' ').forEach(tagName => post.tags.push(new PinboardTag(tagName)));
        return post;
    }
}

export class PinboardPostCollection {
    constructor(
        public date: Date,
        public user: string,
        public posts: PinboardPost[] = []
    ) {}
}

export class PinboardPostsEndpoint {
    public noun = "posts";
    public urlOpts: RequestOptions;
    constructor(baseUrlOpts: RequestOptions, private request: SimpleHttpsRequest = new HttpsRequest()) {
        this.urlOpts = baseUrlOpts.clone();
        this.urlOpts.basePath.push(this.noun);
    }

    public update(): Promise<Date> {
        var opts = this.urlOpts.clone();
        opts.basePath.push('update');
        return this.request.req(opts).then(result => {
            return new Date(result.update_time);
        });
    }

    public get(tag: string[] = [], date?: Date, url?: string, meta: Boolean = false): Promise<any> {
        if (tag.length > 3) {
            throw "Only three tags are supported for this request";
        }
        var opts = this.urlOpts.clone();
        opts.basePath.push('get');
        tag.forEach((t) => { opts.queryParams.push(new QueryParameter('tag', t)); });
        if (date) { opts.queryParams.push(new QueryParameter('dt', Pinboard.dateFormatter(date))); }
        if (url) { opts.queryParams.push(new QueryParameter('url', url)); }
        opts.queryParams.push(new QueryParameter('meta', meta ? "yes" : "no"));

        return this.request.req(opts).then(result => {
            let collection = new PinboardPostCollection(new Date(result.date), result.user);
            result.posts.forEach(postObj => collection.posts.push(PinboardPost.fromObj(postObj)));
            return collection;
        });
    }

    public recent(tag: string[] = [], count?: number): Promise<any> {
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
        return this.request.req(opts);
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
            return tags;
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

    public static dateFormatter(date: Date): string {
        return date.toISOString();
    }
}
