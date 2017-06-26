import fs = require('fs');
import path = require('path');

import debug = require('debug');
let debugLog = debug('pbt');
import { ArgumentParser } from "argparse";

import { Pinboard } from "./pbsdk";

interface PinboardToolConfiguration {
    apitoken?: string;
}

interface PinboardToolAction {
    noun?: string;
    verb?: string;
    apitoken?: string;
    least_used?: number;
    date?: Date;
    url?: string;
    tags?: string[];
    start_index?: number;
    from_date?: Date;
    to_date?: Date;
    results?: number;
    count?: number;
    noteid?: string;
}

// This may get broken out into a real interface later on
type PinboardToolArguments = PinboardToolAction;

class PinboardTool {

    public main(args: string[]): number {
        let parsed: any = this.parseArguments(args);
        let config = this.processConfiguration(parsed);
        let action = this.processAction(config, parsed);
        let pinboard = new Pinboard(action.apitoken);

        let handleApiFailure = (error: any) => {
            console.log(`API error: ${error}`);
            process.exit(1);
        };

        switch (action.noun) {
            case 'tags': {
                switch (action.verb) {
                    case 'get': {
                        pinboard.tags.get().then(tags => {
                            let msg = `There are ${tags.length} tags`;
                            if (action.least_used) {
                                tags.sort((a, b) => a.count - b.count);
                                tags = tags.filter(tag => tag.count <= action.least_used);
                                msg = `There are ${tags.length} tags with ${action.least_used} or fewer bookmarks`;
                            }
                            tags.forEach(tag => console.log(tag));
                            console.log(msg);
                        }, handleApiFailure);
                        break;
                    }
                    case 'rename': {
                        pinboard.tags.rename(action.old, action.new).then(result => console.log(result));
                        break;
                    }
                    default: throw `Unknown verb ${action.verb}`;
                }
                break;
            }
            case 'posts': {
                switch (action.verb) {
                    case 'get': {
                        pinboard.posts.get(action.tags, action.date, action.url, false).then(collection => {
                            console.log("\n" + collection.uiString());
                        }, handleApiFailure);
                        break;
                    }
                    case 'update': {
                        pinboard.posts.update().then(result => console.log(`Last update time: ${result.toString()}`), handleApiFailure);
                        break;
                    }
                    case 'recent': {
                        pinboard.posts.recent(action.tags, action.count).then(collection => console.log(collection.uiString()));
                        break;
                    }
                    default: throw `Unknown verb ${action.verb}`;
                }
                break;
            }
            case 'notes': {
                switch (action.verb) {
                    case 'get': {
                        pinboard.notePosts.get(action.noteid).then(result => console.log(result.uiString()));
                        break;
                    }
                    case 'list': {
                        pinboard.notePosts.list().then(results => results.forEach(result => console.log(result.uiString())));
                        break;
                    }
                    default: throw `Unknown verb ${action.verb}`;
                }
                break;
            }
            default: throw `Unknown noun ${action.noun}`;
        }

        return 0;
    }

    private parseArguments(args: string[]): PinboardToolArguments {
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
        let tagsSubparsers = tagsParser.addSubparsers({title: 'tags', dest: 'verb'});

        let tagsGetParser = tagsSubparsers.addParser('get', {help: 'Get all tags.'});
        tagsGetParser.addArgument(['--least-used', '-l'], {
            type: 'int',
            help: 'Show tags with this many or fewer bookmarks'
        });

        let tagsRenameParser = tagsSubparsers.addParser('rename', {help: 'Rename a tag.'});
        tagsRenameParser.addArgument(['old'], {help: 'The tag to rename'});
        tagsRenameParser.addArgument(['new'], {help: 'The new name of the tag'});

        let postsParser = subParsers.addParser('posts');
        let postsSubparsers = postsParser.addSubparsers({title: 'posts', dest: 'verb'});

        let postsGetParser = postsSubparsers.addParser('get', {help: 'Get all posts for a single date, or get the result for a single URL.'});
        let postGetParserMeg = postsGetParser.addMutuallyExclusiveGroup({required: false});
        postGetParserMeg.addArgument(['--date', '-d'], {
            defaultValue: undefined, type: (d: string)=>new Date(d),
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
            defaultValue: undefined, type: (d: string)=>new Date(d),
            help: 'Return only bookmarks created after this time.'
        });
        postsAllParser.addArgument(['--to-date', '--last-date', '-l'], {
            defaultValue: undefined, type: (d: string)=>new Date(d),
            help: 'Return only bookmarks created before this time.'
        });

        /*let postsUpdateParser = */ postsSubparsers.addParser('update', {
            help: 'Show the most recent time a bookmark was added, updated, or deleted. (Intended to be used before calling /posts/all to see if data has changed since the last fetch.)'
        });

        let postsRecentParser = postsSubparsers.addParser('recent', {
            help: 'Show the most recent posts'
        });
        postsRecentParser.addArgument(['--tags', '-t'], {
            nargs: '+', defaultValue: [],
            help: 'Filter by these tags (three max).'
        });
        postsRecentParser.addArgument(['--count', '-c'], {
            type: 'int', defaultValue: 15,
            help: 'Number of results to return from 1-100.'
        });

        let notesParser = subParsers.addParser('notes');
        let notesSubparsers = notesParser.addSubparsers({title: 'notes', dest: 'verb'});

        /* let notesListParser = */ notesSubparsers.addParser('list', {help: 'List all notes.'});

        let notesGetParser = notesSubparsers.addParser('get', {help: 'Get a single note.'});
        notesGetParser.addArgument(['noteid'], {help: 'The ID of the note.'});

        let parsed = parser.parseArgs(args);
        debugLog(parsed);
        return parsed;
    }

    private processConfiguration(configFile?: string): PinboardToolConfiguration {
        let homeConfig = path.join(process.env['HOME'], '.pbt.config.json');
        let dirConfig = path.join(__dirname, 'pbt.config.json');
        let resolvedConfigPath: string = "";
        if (configFile) {
            resolvedConfigPath = path.resolve(configFile);
        } else if (fs.existsSync(homeConfig)) {
            resolvedConfigPath = homeConfig;
        } else if (fs.existsSync(dirConfig)) {
            resolvedConfigPath = dirConfig;
        }
        let config: PinboardToolConfiguration = resolvedConfigPath ? require(resolvedConfigPath) : {};

        return config;
    }

    private processAction(config: PinboardToolConfiguration, parsedArguments: PinboardToolArguments): PinboardToolAction {
        // Deep copy 'parsedArguments' directly into the 'action' object
        let action: PinboardToolAction = Object.assign({}, parsedArguments);

        // Add CLI overrides
        if (parsedArguments.apitoken) {
            config['apitoken'] = parsedArguments.apitoken;
        }

        // Validate required properties for Action
        // Note that we assume parseArguments() has done validation of commandline arguments
        if (! config.apitoken) {
            throw "Missing API token: pass as an argument, set an environment variable, or place in the config file";
        }

        return action;
    }

}

let pbt = new PinboardTool();
pbt.main(process.argv);
