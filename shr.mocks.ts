import debug = require('debug');
let debugLog = debug('shr');

import { RequestOptions, RequestOptionsParameters, SimpleHttpsRequest } from './shr';

// Functions we can use to test consumers of this library
export class ShrMockerIoPair {
    public opts: RequestOptions;
    constructor(
        optsParams: RequestOptionsParameters,
        public result: string | object // Allow object to simulate automatic parsing of server's JSON response
    ) {
        this.opts = new RequestOptions(optsParams);
    }
}

export class ShrMocker implements SimpleHttpsRequest {
    constructor(public ioPairs: ShrMockerIoPair[]) {};

    public req(options: RequestOptions): Promise<any> {
        debugLog(`${options.method} ${options.fullUrl}`);

        let resultPromise: Promise<any> | undefined;
        this.ioPairs.forEach((pair) => {
            if (options.equals(pair.opts)) {
                resultPromise = Promise.resolve(pair.result)
                return;
            }
        });

        if (resultPromise) {
            return resultPromise;
        } else {
            let errMsg = `\n${options.method} ${options.fullUrl} (input request) do not match any known input/output pair:\n`;
            this.ioPairs.forEach(pair => errMsg += `${pair.opts.method} ${pair.opts.fullUrl}\n`);
            return Promise.reject(new Error(errMsg));
        }
    }
}
