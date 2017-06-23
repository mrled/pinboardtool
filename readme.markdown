# pbt: Pinboard Tool

A learning project attempting to implement a commandline Pinboard API client written in TypeScript for Node.

## Install

Node and NPM are required.

    # Install the (minimal) prerequisite NPM packages
    npm install

    # Run the tests, if desired
    npm run test

    # Start the command line tool and pass the --help argument to it
    npm run start -- --help

## Modules

I have tried to break out the code into sensical modules.

- `shr.ts` is for my `SimpleHttpsRequest` interface and `HttpsRequest` implementation
- `shr.mocks.ts` provides mock objects for the `shr` module
- `pbsdk.ts` is a Pinboard API client library
- `pbt.ts` contains all the commandline logic

## Debugging

I use the `debug` package for simple debug logging, and have separate messages for each module. To see debugging messages, set the `DEBUG` environment variable to contain a comma-separate list of the modules you want to receive debug messages for:

    DEBUG=shr,pbsdk,pbt npm run start -- --help

This works under Windows as well, but you have to set the environment variables ahead of time

    # CMD
    set DEBUG=shr,pbsdk,pbt
    npm run start -- --help

    # Powershell
    $env:DEBUG="shr,pbsdk,pbt"
    npm run start -- --help

## Prerequisites

One goal is to rely on as few NPM dependencies as possible, because of the fragility of the Node dependency system. Dependencies only necessary during development - including `jasmine` for tests and various TypeScript definitions - are preferable to dependencies required to run the generated JavaScript, and dependencies that have no dependencies of their own are preferable to dependencies that bring in a large tree of other NPM packages.

To merely run `pbt` itself after it has been converted from TypeScript, I rely on `argparse`, an excellent JavaScript implementation of Python's `argparse` module, and `debug`, for debug messages.

## Rationale

I want to learn TypeScript, and I want a command line Pinboard client that lets me examine my account, particularly my unorganized tags. I am hopeful that, as the project progresses, this code will be useful to browser API clients as well.
