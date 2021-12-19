#!/usr/bin/env node

/* global process */

var fs = require('fs');
var path = require('path');
var oknok = require('oknok');
var { queue } = require('d3-queue');
var compact = require('lodash.compact');

if (process.argv.length < 2) {
  console.error(
    'Usage: node static-web-cast <directory with meta files> > podcast.xml'
  );
  process.exit(1);
}

const metaDir = process.argv[2];

var metaFiles = fs.readdirSync(metaDir).filter(isAnEntryMetaFile);
console.error('metaFiles', metaFiles);
var q = queue();
metaFiles.forEach(metaFile => q.defer(getAudioEntry, metaFile));
q.awaitAll(oknok({ ok: makePodcastXML, nok: logError }));

function logError(error) {
  console.error(error);
}

function isAnEntryMetaFile(s) {
  return s.includes('-') && s.endsWith('.json');
}

async function getAudioEntry(metaFile, done) {
  try {
    const metaText = await fs.promises.readFile(path.join(metaDir, metaFile), { encoding: 'utf8' });
    var metaEntry = JSON.parse(metaText);
    if (metaEntry.isAudio) {
      done(null, metaEntry);
    } else {
      done();
    }
  } catch (error) {
    // Don't halt the reading of other files just because this one is not readable.
    logError(error);
    done();
  }
}

function makePodcastXML(entries) {
  var entriesWithAudio = compact(entries);
  console.error(entriesWithAudio);
}

