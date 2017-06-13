// Simple HTTPS Request library
// Convenience functions for dealing with Node's HTTPS requests

import https = require('https');

export class QueryParameter {
    constructor(public name: string, public value: string) {}
}

/* A class that can be passed to httpRequest()
 * Note that it is also passable directly to node's https.request()
 */
export class RequestOptions {
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

export function simpleHttpsRequest(options: RequestOptions): Promise<any> {
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
