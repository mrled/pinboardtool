// Simple HTTPS Request library
// Convenience functions for dealing with Node's HTTPS requests

import https = require('https');

export class QueryParameter {
    constructor(public name: string, public value: string) {}
}

export interface RequestOptionsParameters {
    host: string,
    basePath: string[],
    queryParams?: QueryParameter[],
    protocol?: string,
    port?: number,
    parseJson?: boolean,
    method?: string,
    postData?: string
}

/* A class that can be passed to httpRequest()
 * Note that it is also passable directly to node's https.request()
 */
export class RequestOptions {
    public host: string;
    public basePath: string[];
    public protocol: string;
    public port: number;
    public parseJson: boolean;
    public queryParams: QueryParameter[];
    public method: string;
    public postData?: string;

    constructor(params: RequestOptionsParameters) {
        this.host        = params.host;
        this.basePath    = params.basePath;
        this.protocol    = typeof params.protocol    !== 'undefined' ? params.protocol    : "https:";
        this.port        = typeof params.port        !== 'undefined' ? params.port        : 443;
        this.parseJson   = typeof params.parseJson   !== 'undefined' ? params.parseJson   : false;
        this.queryParams = typeof params.queryParams !== 'undefined' ? params.queryParams : [];
        this.method      = typeof params.method      !== 'undefined' ? params.method      : 'GET';
        this.postData    = typeof params.postData    !== 'undefined' ? params.postData    : '';
    }

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
        var ro = new RequestOptions({
            host: this.host,
            basePath: [],
            protocol: this.protocol,
            port: this.port,
            parseJson: this.parseJson,
            queryParams: [],
            method: this.method,
            postData: this.postData
        })
        this.basePath.forEach((bp) => ro.basePath.push(bp));
        this.queryParams.forEach((qp) => ro.queryParams.push(qp));
        return ro;
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
