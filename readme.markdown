# pbt: Pinboard Tool

A learning project attempting to implement a commandline Pinboard API client written in TypeScript for Node.

## Install

Node and NPM are required.

    # Install the (minimal) prerequisite NPM packages
    npm install

    # Start the command line tool and pass the --help argument to it
    npm run start -- --help

## Modules

I have tried to break out the code into sensical modules.

- `shr.ts` is for my `SimpleHttpsRequest` interface and `HttpsRequest` implementation
- `shr.mocks.ts` provides mock objects for the `shr` module
- `pbsdk.ts` is a Pinboard API client library
- `pbt.ts` contains all the commandline logic

## Rationale

I want to learn TypeScript, and I want a command line Pinboard client that lets me examine my account, particularly my unorganized tags. I am hopeful that, as the project progresses, this code will be useful to browser API clients as well.

One goal is to use as few NPM dependencies as possible, because of the fragility of the Node dependency system.
