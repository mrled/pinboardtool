/// <reference path="../node_modules/@types/jasmine/index.d.ts" />

import { Pinboard, PinboardPosts, PinboardTags } from "../pbsdk";
import { RequestOptions, QueryParameter } from "../shr";
import { ShrMockerIoPair, ShrMocker } from "../shr.mocks";

describe("PinboardPosts", () => {
    let authToken = "EXAMPLEAUTHTOKEN";
    let host = "example.com";
    let basePath = [];
    let queryParams = [new QueryParameter('auth_token', authToken), new QueryParameter('format', 'json')];
    let baseUrlOpts = new RequestOptions({host: host, basePath: basePath, queryParams: queryParams})

    describe(".update()", () => {

        let updateTime = "2017-06-12T15:50:00Z";
        let expectedResponse = { update_time: updateTime};
        let mocker = new ShrMocker([
            new ShrMockerIoPair(
                {host: host, basePath: ['posts', 'update'], queryParams: queryParams},
                expectedResponse
            )
        ])
        let pinboardPosts = new PinboardPosts(baseUrlOpts, mocker)

        it("Returns expected data", (done) => {
            pinboardPosts.update().then(result => {
                expect(result).toEqual(new Date (updateTime));
                done();
            }, error => {
                console.log(`ERROR: ${error}`);
                for (var key in error) {
                    console.log(`  ${key} = ${error[key]}`)
                }
            });
        })
        // ,it("Fails with this test", (done) => {
        //     pinboardPosts.update().then(result => {
        //         expect(result).toBe("asdf");
        //         done();
        //     })
        // })
    });
});
