import { QuickTest, QuickTestGroup, quickTestMain } from "./quicktest";
import { Pinboard, PinboardPosts, PinboardTags } from "./pbsdk";
import { RequestOptions, QueryParameter } from "./shr";
import { ShrMockerIoPair, ShrMocker } from "./shr.mocks";

class TestPinboardPosts extends QuickTestGroup {
    tAuthToken = "EXAMPLEAUTHTOKEN";
    tHost = "example.com";
    tBasePath = [];
    tQueryParams: QueryParameter[];
    baseUrlOpts: RequestOptions;
    shrMocker: ShrMocker;
    pinboardPosts: PinboardPosts;
    expectedResponse = "{ update_time: '2017-06-12T15:50:00Z' }"

    constructor() {
        super();
        this.tQueryParams = [new QueryParameter('auth_token', this.tAuthToken), new QueryParameter('format', 'json')];
        this.shrMocker = new ShrMocker([
            new ShrMockerIoPair(
                {host: 'example.com', basePath: ['posts', 'update'], queryParams: this.tQueryParams},
                this.expectedResponse)
        ]);
        this.baseUrlOpts = new RequestOptions({host: this.tHost, basePath: this.tBasePath, queryParams: this.tQueryParams})
        this.pinboardPosts = new PinboardPosts(this.baseUrlOpts, this.shrMocker)
    }

    tests = [
        new QuickTest('PinboardPostsUpdate', () => {
            return this.pinboardPosts.update().then(result => {
                if (result === this.expectedResponse) {
                    Promise.resolve(true);
                } else {
                    Promise.reject(false);
                }
            });
        }),
        new QuickTest('ExampleTestFailure', () => {
            throw "example thrown error";
        })
    ]
}

quickTestMain([
    new TestPinboardPosts()
]);
