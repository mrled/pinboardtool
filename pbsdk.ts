import { RequestOptions, QueryParameter, SimpleHttpsRequest, HttpsRequest } from "./shr";

export class PinboardPosts {
    public noun = "posts";
    public urlOpts: RequestOptions;
    constructor(baseUrlOpts: RequestOptions, private request: SimpleHttpsRequest = new HttpsRequest()) {
        this.urlOpts = baseUrlOpts;
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
        var opts = this.urlOpts.clone();
        opts.basePath.push('get');
        tag.forEach((t) => { opts.queryParams.push(new QueryParameter('tag', t)); });
        if (date) { opts.queryParams.push(new QueryParameter('dt', Pinboard.dateFormatter(date))); }
        if (url) { opts.queryParams.push(new QueryParameter('url', url)); }
        opts.queryParams.push(new QueryParameter('meta', meta ? "yes" : "no"));
        return this.request.req(opts);
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

export class PinboardTags {
    public noun = "tags";
    public urlOpts: RequestOptions;
    constructor(baseUrlOpts: RequestOptions, private request: SimpleHttpsRequest = new HttpsRequest()) {
        this.urlOpts = baseUrlOpts;
        this.urlOpts.basePath.push(this.noun);
    }

    public get(): Promise<object> {
        var opts = this.urlOpts.clone();
        opts.basePath.push('get');
        return this.request.req(opts);
    }
}

export class Pinboard {
    public posts: PinboardPosts;
    public tags: PinboardTags;
    public baseUrlOpts = new RequestOptions({host: 'api.pinboard.in', basePath: ['v1']});

    constructor(apitoken: string) {
        this.baseUrlOpts.queryParams.push(
            new QueryParameter('auth_token', apitoken),
            new QueryParameter('format', 'json')
        );
        this.baseUrlOpts.parseJson = true;

        this.posts = new PinboardPosts(this.baseUrlOpts.clone());
        this.tags = new PinboardTags(this.baseUrlOpts.clone());
    }

    public static dateFormatter(date: Date): string {
        return date.toISOString();
    }
}
