/// <reference path="../node_modules/@types/jasmine/index.d.ts" />

import { Pinboard, PinboardTag, PinboardNote, PinboardPost, PinboardPostsEndpoint, PinboardTagsEndpoint, PinboardNotesEndpoint } from "../pbsdk";
import { RequestOptions, QueryParameter } from "../shr";
import { ShrMockerIoPair, ShrMocker } from "../shr.mocks";

/* Notes on testing
 * We use JavaScript objects as server responses to emulate automatic JSON decoding in node's https.request() function
 */

describe("Pinboard", () => {
    let authToken = "EXAMPLEAUTHTOKEN";
    let host = "example.com";
    let basePath = [];
    let queryParams = [
        new QueryParameter({name: 'auth_token', value: authToken, noEncodeValue: true}),
        new QueryParameter({name: 'format', value: 'json'})];
    let baseUrlOpts = new RequestOptions({host: host, basePath: [], queryParams: queryParams});

    describe("PinboardPostsEndpoint", ()=>{

        describe(".update()", () => {

            let updateTime = "2017-06-12T15:50:00Z";
            let serverResponse = { update_time: updateTime};
            let mocker = new ShrMocker([
                new ShrMockerIoPair({host: host, basePath: ['posts', 'update'], queryParams: queryParams}, serverResponse)
            ]);
            let pinboardPosts = new PinboardPostsEndpoint(baseUrlOpts, mocker);

            it("Returns expected data", (done) => {
                pinboardPosts.update().then(result => {
                    expect(result).toEqual(new Date (updateTime));
                    done();
                }, error => {
                    console.log(`ERROR: ${error}`);
                    for (let key in error) {
                        console.log(`  ${key} = ${error[key]}`);
                    }
                });
            })
        });

    })

    describe("PinboardTagsEndpoint", ()=>{
        describe(".get()", ()=>{
            let expectedResponse = { '': 1000, mpegs: 324, perversions: 876, 'parts:tits': 123, 'parts:ass': 104};
            let expectedTags: PinboardTag[] = [];
            for (let tagName in expectedResponse) {
                expectedTags.push(new PinboardTag(tagName, expectedResponse[tagName]));
            }
            let mocker = new ShrMocker([
                new ShrMockerIoPair(
                    {host: host, basePath: ['tags', 'get'], queryParams: queryParams},
                    expectedResponse
                )
            ]);
            let pinboardTags = new PinboardTagsEndpoint(baseUrlOpts, mocker);

            it("Returns expected data", (done) => {
                pinboardTags.get().then(tags => {
                    expect(tags).toEqual(expectedTags);
                    done();
                });
            });

        });

        describe(".rename()", () =>{
            let expectedResponse = { result: 'done' };
            let renameQp: QueryParameter[] = [];
            queryParams.forEach(qp => renameQp.push(qp.clone()));
            let oldName = 'exampleOldTagName',
                newName = 'exampleNewTagname';
            renameQp.push(new QueryParameter({name: 'old', value: oldName}));
            renameQp.push(new QueryParameter({name: 'new', value: newName}));
            let mocker = new ShrMocker([
                new ShrMockerIoPair(
                    {host: host, basePath: ['tags', 'rename'], queryParams: renameQp},
                    expectedResponse
                )
            ]);
            let pinboardTags = new PinboardTagsEndpoint(baseUrlOpts, mocker);

            it("Should return done", done => {
                pinboardTags.rename(oldName, newName).then(result => {
                    expect(result).toEqual(expectedResponse);
                    done();
                });
            });
        });

    });


    describe("PinboardNotesEndpoint", ()=>{
        describe(".list()", ()=>{
            let serverResponse = {
                count: 3,
                notes: [
                    { id: '1269390a115d57a6a1df',
                        hash: '2ae1cd3b209b25218bfe',
                        title: 'Luzarius Live Dragon Age Comment (June 13th update)',
                        length: '15277',
                        created_at: '2015-06-18 20:32:46',
                        updated_at: '2015-06-18 20:32:46' },
                    { id: '0f36e438a70995557062',
                        hash: '4eced4628d8f0c1510a4',
                        title: 'Potato Salad',
                        length: '78',
                        created_at: '2015-07-06 16:16:05',
                        updated_at: '2015-07-06 16:16:05' },
                    { id: '45ac2da2b5a9f3ada7ea',
                        hash: '5a91d945a7f0d5579410',
                        title: 'audiotodo',
                        length: '215',
                        created_at: '2016-08-04 14:36:49',
                        updated_at: '2016-08-05 12:15:13' }
            ]};
            let expectedValue = [
                new PinboardNote(
                    '1269390a115d57a6a1df',
                    'Luzarius Live Dragon Age Comment (June 13th update)',
                    new Date('2015-06-18 20:32:46'),
                    new Date('2015-06-18 20:32:46'),
                    '2ae1cd3b209b25218bfe'),
                new PinboardNote(
                    '0f36e438a70995557062',
                    'Potato Salad',
                    new Date('2015-07-06 16:16:05'),
                    new Date('2015-07-06 16:16:05'),
                    '4eced4628d8f0c1510a4'),
                new PinboardNote(
                    '45ac2da2b5a9f3ada7ea',
                    'audiotodo',
                    new Date('2016-08-04 14:36:49'),
                    new Date('2016-08-05 12:15:13'),
                    '5a91d945a7f0d5579410'),
            ];

            let mocker = new ShrMocker([
                new ShrMockerIoPair({host: host, basePath: ['notes', 'list'], queryParams: queryParams}, serverResponse)
            ]);
            let pinboardNotes = new PinboardNotesEndpoint(baseUrlOpts, mocker);

            it("Returns expected data", (done) => {
                pinboardNotes.list().then(result => {
                    for (let ctr=0; ctr<=result.length -1; ++ctr) {
                        expect(result[ctr].title).toEqual(expectedValue[ctr].title);
                    }
                    done();
                });
            });

        });

        describe(".get(noteid)", ()=>{
            let expectedResponse = {
                id: '0235ab0c3468486ad6ef',
                title: 'Pleasurable Buzz',
                created_at: '2015-05-21 18:44:46',
                updated_at: '2015-05-21 18:44:46',
                length: 379,
                text: 'This is like, surrealist scifi stuff, I guess? \r\n\r\nIt comes from a William Gibson quote:\r\n\r\n"Coming up with a word like neuromancer is something that would earn you a really fine vacation if you worked in an ad agency. It was a kind of booby-trapped portmanteau that contained considerable potential for cognitive dissonance, that pleasurable buzz of feeling slightly unsettled."',
                hash: '733bd9987b55e54c8419'
            };
            let expectedNote = new PinboardNote(
                expectedResponse.id,
                expectedResponse.title,
                new Date(expectedResponse.created_at),
                new Date(expectedResponse.updated_at),
                expectedResponse.hash,
                expectedResponse.text)

            let mocker = new ShrMocker([
                new ShrMockerIoPair(
                    {host: host, basePath: ['notes', expectedResponse.id], queryParams: queryParams},
                    expectedResponse
                )
            ]);
            let pinboardNotes = new PinboardNotesEndpoint(baseUrlOpts, mocker);

            it("Returns expected data", (done) => {
                pinboardNotes.get(expectedResponse.id).then(result => {
                    expect(result.title).toEqual(expectedNote.title);
                    done();
                });
            });
        });
    });
});
