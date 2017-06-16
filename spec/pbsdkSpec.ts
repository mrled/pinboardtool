/// <reference path="../node_modules/@types/jasmine/index.d.ts" />

import { Pinboard, PinboardTag, PinboardPostsEndpoint, PinboardTagsEndpoint } from "../pbsdk";
import { RequestOptions, QueryParameter } from "../shr";
import { ShrMockerIoPair, ShrMocker } from "../shr.mocks";

describe("Pinboard", () => {
    let authToken = "EXAMPLEAUTHTOKEN";
    let host = "example.com";
    let basePath = [];
    let queryParams = [new QueryParameter('auth_token', authToken), new QueryParameter('format', 'json')];
    let baseUrlOpts = new RequestOptions({host: host, basePath: [], queryParams: queryParams})

    describe("PinboardPostsEndpoint", ()=>{

        describe(".update()", () => {

            var updateTime = "2017-06-12T15:50:00Z";
            var expectedResponse = { update_time: updateTime};
            var mocker = new ShrMocker([
                new ShrMockerIoPair(
                    {host: host, basePath: ['posts', 'update'], queryParams: queryParams},
                    expectedResponse
                )
            ])
            var pinboardPosts = new PinboardPostsEndpoint(baseUrlOpts, mocker)

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
            /*
            ,it("Fails with this test", (done) => {
                pinboardPosts.update().then(result => {
                    expect(result).toBe(new Date());
                    done();
                })
            })
            */
        });

    })

    describe("PinboardTagsEndpoint", ()=>{
        describe(".get()", ()=>{
            var expectedResponse = { '': 1000, mpegs: 324, perversions: 876, 'parts:tits': 123, 'parts:ass': 104};
            var expectedTags: PinboardTag[] = []
            for (var tagName in expectedResponse) {
                expectedTags.push(new PinboardTag(tagName, expectedResponse[tagName]));
            }
            var mocker = new ShrMocker([
                new ShrMockerIoPair(
                    {host: host, basePath: ['tags', 'get'], queryParams: queryParams},
                    expectedResponse
                )
            ]);
            var pinboardTags = new PinboardTagsEndpoint(baseUrlOpts, mocker);

            it("Returns expected data", (done) => {
                pinboardTags.get().then(tags => {
                    expect(tags).toEqual(expectedTags);
                    done();
                });
            })

        })
    })

});
