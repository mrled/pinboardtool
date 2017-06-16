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

    req(options: RequestOptions): Promise<any> {
        debugLog(`${options.method} ${options.fullUrl}`);
        var match: Promise<any>;
        this.ioPairs.forEach((pair) => {
            if (options.equals(pair.opts)) {
                match = Promise.resolve(pair.result);
                return;
            }
        });
        if (typeof match !== 'undefined') {
            return match;
        } else {
            throw `Passed options (url: ${options.fullUrl}) do not match any known input/output pair`;
        }
    }
}
