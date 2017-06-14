export class QuickTest {
    constructor(
        public name: string,
        public test: ()=>Promise<any>
    ) {}
}

export abstract class QuickTestGroup {
    name: string = this.constructor.name;
    tests: QuickTest[];
}

export function quickTestMain(testGroups: QuickTestGroup[]): void {
    var failure = false;

    if (testGroups.length < 1) {
        console.log("No test groups defined. Exiting, I guess...");
        process.exit(0);
    }

    testGroups.forEach(group => {
        console.log(`Starting to test testgroup ${group.name}`);
        group.tests.forEach(test => {
            test.test().then(() => {
                console.log(`Test ${test.name} completed successfully!`);
            }).catch(error => {
                console.log(`Test ${test.name} FAILED with error ${error}`);
                failure = true;
            })
        });
    })

    if (failure) {
        console.log("TEST FAILURES");
        process.exit(1);
    } else {
        console.log("All tests passed successfully!");
        process.exit(0);
    }
}
