type SingleTest = () => Promise<any>;

export class QuickTestResult {
    constructor(public name: string, public succeeded: boolean, public result: any) {};
}

export abstract class QuickTestGroup {
    name = this.constructor.name;
    abstract tests: { [key: string]: SingleTest }

    test(): Promise<QuickTestResult[]> {
        var allTests: Promise<QuickTestResult>[] = [];
        for (var tName in this.tests) {
            // allTests.push(this.testRunner(tName, this.tests[tName]));
            var thisResult = this.testRunner(tName, this.tests[tName]).catch(error => console.log(`lol err ${error}`))   ;
            console.log(`Result is type ${typeof thisResult} and value ${thisResult}`)
            allTests.push(thisResult);
        }
        return Promise.all(allTests);
    }

    testRunner(name: string, test: SingleTest): Promise<QuickTestResult> {
        console.log(`Starting test ${name}`)
        return test().then(result => {
            console.log(`Test ${name} completed successfully!`);
            return Promise.resolve(new QuickTestResult(name, true, result));
        }).catch(error => {
            console.log(`Test ${name} FAILED with error ${error}`);
            return Promise.reject(new QuickTestResult(name, false, error));
        });
    }
}

export function quickTestMain(testGroups: QuickTestGroup[]): void {
    var failure = false;
    if (testGroups.length < 1) {
        console.log("No test groups defined. Exiting, I guess...");
        process.exit(0);
    }
    testGroups.forEach(group => {
        console.log(`Starting to test testgroup ${group.name}`);
        group.test().catch(failureList => {
            console.log(`Failure found for group ${group.name}`);
            failure = true;
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
