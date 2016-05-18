#!/usr/bin/env node

/**
 * socko
 * Hierarchical file weaver.
 */

var cli = require('seeli'),
    generateCommand = require('./lib/commands/generate');

// We want our app to exit when there is an error.

cli.exitOnError = true;

// Add all the available commands

cli.use('generate', generateCommand);

// And go!

cli.run();
