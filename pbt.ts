import fs = require('fs');
import path = require('path');

import debug = require('debug');
let debugLog = debug('pbt');
import { ArgumentParser } from "argparse";
import ArgParseModule = require('argparse');

import { Pinboard } from "./pbsdk";

class Startup {
    public static main(): number {
        let homeConfig: string;
        let dirConfig: string;
        let config: any;

        let parser = new ArgumentParser({
            version: '0.0.1',
            addHelp: true,
            description: 'pbt: Pinboard Tool'
        });
        let subParsers = parser.addSubparsers({title: 'noun', dest: 'noun'});
        parser.addArgument(['--configfile', '-c'], {
            help: `Location of the config file. Looks in ~/.pbt.config.json, then ${__dirname}/pbt.config.json`
        });
        parser.addArgument(['--apitoken', '-t'], {
            defaultValue: process.env['PINBOARD_API_TOKEN'],
            help: 'Pinboard API token; if unspecified, use PINBOARD_API_TOKEN environment variable'
        });

        let tagsParser = subParsers.addParser('tags');
        tagsParser.addArgument(['--least-used', '-l'], {
            type: 'int',
            help: 'Show tags with fewer than this many bookmarks'
        });

        let postsParser = subParsers.addParser('posts');
        let postsSubparsers = postsParser.addSubparsers({title: 'posts', dest: 'verb'});

        let postsGetParser = postsSubparsers.addParser('get', {help: 'Get all posts for a single date, or get the result for a single URL.'});
        let postGetParserMeg = postsGetParser.addMutuallyExclusiveGroup({required: false});
        postGetParserMeg.addArgument(['--date', '-d'], {
            defaultValue: undefined, type: d=>new Date(d),
            help: 'The date to get posts for. (If unspecified, use the most recent date that a change was made to the Pinboard account.)'
        });
        postGetParserMeg.addArgument(['--url', '-u'], {
            help: 'Get a single result for this specific URL.'
        });
        postsGetParser.addArgument(['--tags', '-t'], {
            nargs: '+', defaultValue: [],
            help: 'Show bookmarks with these tags (three max).'
        });

        let postsAllParser = postsSubparsers.addParser('all', {
            help: 'Get *all* posts. Warning: 5 minutes must pass before you can call this again. Save the bookmarks with the first time you call this, then run --last-update before future calls. If --last-update returns a date before the first call, there is no need to call it again.'
        });
        postsAllParser.addArgument(['--tags', '-t'], {
            nargs: '+', defaultValue: [],
            help: 'Show bookmarks with these tags (three max).'
        });
        postsAllParser.addArgument(['--start-index', '-s'], {
            type: 'int',
            help: 'Offset value. If unspecified, default to 0.'
        });
        postsAllParser.addArgument(['--results', '-r'], {
            type: 'int',
            help: 'Number of results to return. Default is all.'
        });
        postsAllParser.addArgument(['--from-date', '-f'], {
            defaultValue: undefined, type: d=>new Date(d),
            help: 'Return only bookmarks created after this time.'
        });
        postsAllParser.addArgument(['--to-date', '--last-date', '-l'], {
            defaultValue: undefined, type: d=>new Date(d),
            help: 'Return only bookmarks created before this time.'
        });

        let postsExclusiveGroup = postsParser.addMutuallyExclusiveGroup({required: false});
        postsExclusiveGroup.addArgument(['--last-update', '-l'], {
            nargs: 0,
            help: 'Show the most recent time a bookmark was added, updated, or deleted. (Intended to be used before calling /posts/all to see if data has changed since the last fetch.)'
        });

        let parsed = parser.parseArgs();
        debugLog(parsed);

        if (! parsed.configfile) {
            homeConfig = path.join(process.env['HOME'], '.pbt.config.json');
            dirConfig = path.join(__dirname, 'pbt.config.json');
            if (fs.existsSync(homeConfig)) {
                parsed.configfile = homeConfig;
            } else if (fs.existsSync(dirConfig)) {
                parsed.configfile = dirConfig;
            }
        }

        config = parsed.configfile ? require(parsed.configfile) : {};
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

        switch (parsed.noun) {
            case 'tags': {
                switch (parsed.verb) {
                    case 'get': {
                        if (parsed.least_used) {
                            pinboard.tags.get().then(tags => {
                                tags.sort((a, b) => a.count - b.count);
                                tags.filter(tag => tag.count <= parsed.least_used).forEach(tag => console.log(tag));
                            }, handleApiFailure);
                        } else {
                            // Show all tags
                            pinboard.tags.get().then(tags => tags.forEach(tag => console.log(tag)), handleApiFailure);
                        }
                        break;
                    }
                    default: throw `Unknown verb ${parsed.verb}`;
                }
                break;
            }
            case 'posts': {
                switch (parsed.verb) {
                    case 'get': {
                        pinboard.posts.get(parsed.tags, parsed.date, parsed.url, false).then(collection => {
                            console.log("\n" + collection.uiString());
                        }, handleApiFailure);
                        break;
                    }
                    case 'update': {
                        pinboard.posts.update().then(result => console.log(`Last update time: ${result.toString()}`), handleApiFailure);
                        break;
                    }
                    default: throw `Unknown verb ${parsed.verb}`;
                }
                break;
            }
            default: throw `Unknown noun ${parsed.noun}`;
        }

        return 0;
    }
}

Startup.main();
