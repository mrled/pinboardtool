import fs = require('fs');
import https = require('https');
import path = require('path');
import { ArgumentParser } from "argparse";

class QueryParameter {
    constructor(public name: string, public value: string) {}
}

/* A class that can be passed to httpRequest()
 * Note that it is also passable directly to node's https.request()
 */
class RequestOptions {
    constructor(
        public host: string,
        public basePath: string[],
        public protocol: string = "https:",
        public port: number = 443,
        public parseJson: boolean = false,
        public queryParams: QueryParameter[] = [],
        public method: string = 'GET',
        public postData?: string
    ) {}

    get path(): string {
        return `/${this.basePath.join('/')}${this.urlParametersString}`;
    }

    get urlParametersString(): string {
        var uas = "";
        this.queryParams.forEach((parameter) => {
            if (uas.length === 0) { uas += '?'; } else { uas += '&'; }
            uas += `${parameter.name}=${parameter.value}`;
        });
        return uas;
    }

    get fullUrl(): string {
        return `${this.protocol}//${this.host}:${this.port}${this.path}`;
    }

    clone(): RequestOptions {
        var newBasePath: string[] = [],
            newUrlParams: QueryParameter[] = [];
        this.basePath.forEach((bp) => { newBasePath.push(bp); });
        this.queryParams.forEach((up) => { newUrlParams.push(up); });
        // for (var k in this.urlArguments) { newUrlArgs[k] = this.urlArguments[k] };
        return new RequestOptions(
            this.host,
            newBasePath,
            this.protocol,
            this.port,
            this.parseJson,
            newUrlParams,
            this.method,
            this.postData);
    }

    // Turns out, having path be a computed property in TypeScript doesn't work for https.request()
    get nodeRequestOpts(): object {
        return {
            host: this.host,
            path: this.path,
            protocol: this.protocol,
            port: this.port,
            method: this.method
        }
    }
}

function httpsRequest(options: RequestOptions) {
    return new Promise<any>((resolve, reject) => {
        var rejecting = false;
        var ro = options.nodeRequestOpts;
        var req = https.request(ro, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) { rejecting = true; }

            var body = [];
            res.on('data', (chunk) => body.push(chunk));

            res.on('end', () => {
                var b = Buffer.concat(body).toString();
                if (rejecting) {
                    reject(new Error(`ERROR ${res.statusCode} when attempting to ${options.method} '${options.fullUrl}'\r\n${b}`));
                } else {
                    if (options.parseJson) {
                        resolve(JSON.parse(b));
                    } else {
                        resolve(b);
                    }
                }
            });
        });

        req.on('error', (err) => reject(err));
        if (options.postData) { req.write(options.postData); }

        req.end();
    });
}

class PinboardPosts {
    public noun = "posts";
    public urlOpts: RequestOptions;
    constructor(baseUrlOpts: RequestOptions) {
        this.urlOpts = baseUrlOpts;
        this.urlOpts.basePath.push(this.noun);
    }

    public update(): Promise<Date> {
        var opts = this.urlOpts.clone();
        opts.basePath.push('update');
        return httpsRequest(opts);
    }

    public get(tag: string[] = [], date?: Date, url?: string, meta: Boolean = false): Promise<any> {
        var opts = this.urlOpts.clone();
        opts.basePath.push('get');
        tag.forEach((t) => { opts.queryParams.push(new QueryParameter('tag', t)); });
        if (date) { opts.queryParams.push(new QueryParameter('dt', Pinboard.dateFormatter(date))); }
        if (url) { opts.queryParams.push(new QueryParameter('url', url)); }
        opts.queryParams.push(new QueryParameter('meta', meta ? "yes" : "no"));
        return httpsRequest(opts);
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
        return httpsRequest(opts);
    }
}

class PinboardTags {
    public noun = "tags";
    public urlOpts: RequestOptions;
    constructor(baseUrlOpts: RequestOptions) {
        this.urlOpts = baseUrlOpts;
        this.urlOpts.basePath.push(this.noun);
    }

    public get(): Promise<object> {
        var opts = this.urlOpts.clone();
        opts.basePath.push('get');
        return httpsRequest(opts);
    }
}

class Pinboard {
    public posts: PinboardPosts;
    public tags: PinboardTags;
    public baseUrlOpts = new RequestOptions('api.pinboard.in', ['v1']);

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

class Startup {
    public static main(): number {
        var parser = new ArgumentParser({
            version: '0.0.1',
            addHelp: true,
            description: 'pbt: Pinboard Tool'
        })
        parser.addArgument(['--configfile', '-c'], {
            help: `Location of the config file. Looks in ~/.pbt.config.json, then ${__dirname}/pbt.config.json`
        })
        parser.addArgument(['--apitoken', '-t'], {
            defaultValue: process.env['PINBOARD_API_TOKEN'],
            help: 'Pinboard API token; if unspecified, use PINBOARD_API_TOKEN environment variable'
        });
        var parsed = parser.parseArgs();

        if (! parsed.configfile) {
            var homeConfig = path.join(process.env['HOME'], '.pbt.config.json');
            var dirConfig = path.join(__dirname, 'pbt.config.json');
            if (fs.existsSync(homeConfig)) {
                parsed.configfile = homeConfig;
            } else if (fs.existsSync(dirConfig)) {
                parsed.configfile = dirConfig;
            }
        }

        var config = parsed.configfile ? require(parsed.configfile) : {};
        if (parsed.apitoken) {
            config['apitoken'] = parsed.apitoken;
        }

        if (! config.apitoken) {
            throw "Missing API token: pass as an argument, set an environment variable, or place in the config file";
        }

        var pinboard = new Pinboard(config.apitoken);
        this.promisePrinter(pinboard.posts.update());
        // this.promisePrinter(pinboard.tags.get());
        // this.promisePrinter(pinboard.posts.recent(['gamepc']));
        // this.promisePrinter(pinboard.posts.get([], new Date('2017-06-11')));

        return 0;
    }

    public static promisePrinter(prom: Promise<any>): void {
        prom.then((result) => {
            console.log(result);
        }).catch((error) => {
            console.log(`ERROR!\r\n${error}`);
            process.exit(1);
        })
    }
}

Startup.main();
