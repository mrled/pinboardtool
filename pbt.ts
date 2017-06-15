import fs = require('fs');
import path = require('path');
import { ArgumentParser } from "argparse";

import { Pinboard, PinboardTag } from "./pbsdk";

class Startup {
    public static main(): number {
        var parser = new ArgumentParser({
            version: '0.0.1',
            addHelp: true,
            description: 'pbt: Pinboard Tool'
        })
        parser.addArgument(['--configfile', '-c'], {
            help: `Location of the config file. Looks in ~/.pbt.config.json, then ${__dirname}/pbt.config.json`
        })
        parser.addArgument(['--apitoken', '-t'], {
            defaultValue: process.env['PINBOARD_API_TOKEN'],
            help: 'Pinboard API token; if unspecified, use PINBOARD_API_TOKEN environment variable'
        });
        parser.addArgument(['action'], {
            choices: ['least-used-tags', 'last-update'],
            help: 'The action'
        })

        var parsed = parser.parseArgs();

        if (! parsed.configfile) {
            var homeConfig = path.join(process.env['HOME'], '.pbt.config.json');
            var dirConfig = path.join(__dirname, 'pbt.config.json');
            if (fs.existsSync(homeConfig)) {
                parsed.configfile = homeConfig;
            } else if (fs.existsSync(dirConfig)) {
                parsed.configfile = dirConfig;
            }
        }

        var config = parsed.configfile ? require(parsed.configfile) : {};
        if (parsed.apitoken) {
            config['apitoken'] = parsed.apitoken;
        }

        if (! config.apitoken) {
            throw "Missing API token: pass as an argument, set an environment variable, or place in the config file";
        }

        let pinboard = new Pinboard(config.apitoken);

        let handleApiFailure = (error) => {
            console.log(`API error: ${error}`);
            process.exit(1);
        };

        switch (parsed.action) {
            case 'least-used-tags': {
                pinboard.tags.get().then(tags => {
                    tags.sort((a, b) => a.count - b.count);
                    tags.forEach(tag => console.log(tag));
                }, handleApiFailure);
            }
            case 'last-update': {
                pinboard.posts.update().then(result => console.log(`Last update time: ${result.toString()}`));
            }
        }

        return 0;
    }

    public static promisePrinter(prom: Promise<any>): void {
        prom.then((result) => {
            console.log(result);
        }).catch((error) => {
            console.log(`ERROR!\r\n${error}`);
            process.exit(1);
        })
    }
}

Startup.main();
