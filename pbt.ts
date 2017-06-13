import fs = require('fs');
import path = require('path');
import { ArgumentParser } from "argparse";

import { Pinboard, PinboardPosts, PinboardTags } from "./pbsdk";

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

        var pinboard = new Pinboard(config.apitoken);
        this.promisePrinter(pinboard.posts.update());
        // this.promisePrinter(pinboard.tags.get());
        // this.promisePrinter(pinboard.posts.recent(['gamepc']));
        // this.promisePrinter(pinboard.posts.get([], new Date('2017-06-11')));

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
