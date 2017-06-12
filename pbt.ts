import fs = require('fs');
import https = require('https');
import path = require('path');
import { ArgumentParser } from "argparse";

/* A class that can be passed to httpRequest()
 * Note that it is also passable directly to node's https.request()
 */
class RequestOptions {
    constructor(
        public host: string,
        public basePath: string[],
        public protocol: string = "https:",
        public port: number = 443,
        public urlArguments: {string?: string} = {},
        public method: string = 'GET',
        public postData?: string
    ) {}

    get path(): string {
        return `/${this.basePath.join('/')}${this.urlArgumentsString}`;
    }

    get urlArgumentsString(): string {
        var uas = "";
        for (var key in this.urlArguments) {
            var initChar = (uas.length == 0) ? '?' : '&';
            var thisArgStr = `${key}=${this.urlArguments[key]}`;
            uas += `${initChar}${thisArgStr}`;
        }
        return uas;
    }

    get fullUrl(): string {
        return `${this.protocol}//${this.host}:${this.port}${this.path}`;
    }

    clone(): RequestOptions {
        return new RequestOptions(this.host, this.basePath, this.protocol, this.port, this.urlArguments, this.method, this.postData);
    }

    // Turns out, having path be a computed property in TypeScript doesn't work for https.request()
    get nodeRequestOpts(): any {
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
                    resolve(b);
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
    constructor(private baseUrlOpts: RequestOptions) {
        this.urlOpts = this.baseUrlOpts;
        this.urlOpts.basePath.push(this.noun);
    }

    public update(): Promise<Date> {
        var opts = this.urlOpts.clone();
        opts.basePath.push('update');
        return httpsRequest(opts) as Promise<Date>;
    }
}

class Pinboard {
    public baseUrlOpts = new RequestOptions('api.pinboard.in', ['v1']);
    constructor(apitoken: string) {
        this.baseUrlOpts.urlArguments['auth_token'] = apitoken;
        this.baseUrlOpts.urlArguments['format'] = 'json';
    }
    public posts = new PinboardPosts(this.baseUrlOpts.clone());
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
        pinboard.posts.update().then((result) => {
            console.log(result)
        }).catch((error) => {
            console.log(`ERROR!\r\n${error}`);
        });

        return 0;
    }
}

Startup.main();
