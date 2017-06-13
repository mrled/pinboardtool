import assert = require('assert');
import { Pinboard, PinboardPosts, PinboardTags } from "./pbsdk";
import { RequestOptions, QueryParameter } from "./shr";
import { ShrMockerIoPair, ShrMocker } from "./shr.mocks";

abstract class Test {
    abstract test(): Promise<any>;
}

class TestPinboardPostsUpdate extends Test {
    tAuthToken = "EXAMPLEAUTHTOKEN";
    tHost = "example.com";
    tBasePath = [];
    tQueryParams: QueryParameter[];
    baseUrlOpts: RequestOptions;
    shrMocker: ShrMocker;
    pinboardPosts: PinboardPosts;

    constructor() {
        super();
        this.tQueryParams = [new QueryParameter('auth_token', this.tAuthToken), new QueryParameter('format', 'json')];
        this.shrMocker = new ShrMocker([
            new ShrMockerIoPair(
                {host: 'example.com', basePath: ['posts', 'update'], queryParams: this.tQueryParams},
                "YAY")
        ]);
        this.baseUrlOpts = new RequestOptions({host: this.tHost, basePath: this.tBasePath, queryParams: this.tQueryParams})
        this.pinboardPosts = new PinboardPosts(this.baseUrlOpts, this.shrMocker)
    }

    test(): Promise<any> {
        return Promise.all([this.pinboardPosts.update(), Promise.resolve("YAY")]).then(values => {
            if (values[0] === values[1]) {
                Promise.resolve(true);
            }
            console.log(`Tested values '${values[0]}' and '${values[1]}' did not match`);
            Promise.reject(false);
        });
    }
}

class Startup {
    public static main(): number {
        var tests = new TestPinboardPostsUpdate();
        var ret = 0;
        tests.test().then(result => {
            console.log('Tests passed successfully!');
        }).catch(error => {
            ret = 1;
            console.log(`TESTS FAILED: ${error}`);
        })
        return ret;
    }
}

Startup.main();
