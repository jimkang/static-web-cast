#!/usr/bin/env node

/* global process */

var fs = require('fs');
//var path = require('path');
//var oknok = require('oknok');
//var { queue } = require('d3-queue');

if (process.argv.length < 2) {
  console.error(
    'Usage: node static-web-cast <directory with meta files> > podcast.xml'
  );
  process.exit(1);
}

const metaDir = process.argv[2];

var metaFiles = fs.readdirSync(metaDir).filter(isAnEntryMetaFile);
console.error('metaFiles', metaFiles);

function logError(error) {
  console.error(error);
}

function isAnEntryMetaFile(s) {
  return s.includes('-') && s.endsWith('.json');
}

