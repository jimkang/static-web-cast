#!/usr/bin/env node

/* global process, __dirname */

var fs = require('fs');
var path = require('path');
var oknok = require('oknok');
var { queue } = require('d3-queue');
var compact = require('lodash.compact');
var RSS = require('rss');

if (process.argv.length < 2) {
  console.error(
    'Usage: node static-web-cast <config path> > podcast.xml'
  );
  process.exit(1);
}

const configPath = process.argv[2];

var config = require(path.join(__dirname, configPath));
const metaDir = config.metaFilesLocation;

var metaFiles = fs.readdirSync(metaDir).filter(isAnEntryMetaFile);
//console.error('metaFiles', metaFiles);
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
  //console.error(entriesWithAudio);
  // TODO: Put this in the config.
  var rssFeedOpts = {
    feed_url: `${config.baseURL}/${config.rssFilename}`,
    site_url: config.baseURL,
    link: config.baseURL,
    custom_namespaces: {
      'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
      'googleplay': 'http://www.google.com/schemas/play-podcasts/1.0'
    },
    custom_elements: [
      {'googleplay:block': 'yes'},
      {image: { url: config.podcastImageURL }},
      {language: config.language}
    ] 
  };
  var feed = new RSS(rssFeedOpts);
  entriesWithAudio.forEach(addToFeed);
  console.log(feed.xml({ indent: true }));

  function addToFeed({ caption, mediaFilename, id, date }) {
    const postLink = `${config.baseURL}/${id}.html`;
    feed.item({
      title: caption,
      description: caption,
      link: postLink,
      guid: postLink,
      date,
      enclosure: {
        url: `${config.mediaBaseURL}/${mediaFilename}`,
      },
      custom_elements: [
        { 'itunes:explicit': 'No' },
        { 'itunes:duration': 1717 },
        { 'itunes:season': 1 },
        { 'itunes:episode': 24 },
        { 'itunes:episodeType': 'full' }
      ]
    });
  }
}
