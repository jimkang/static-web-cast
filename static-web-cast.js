#!/usr/bin/env node

/* global process, __dirname */

var fs = require('fs');
var path = require('path');
var oknok = require('oknok');
var { queue } = require('d3-queue');
var compact = require('lodash.compact');
var RSS = require('rss');
var MediaInfo = require('mediainfo.js');
var {pipeline} = require('stream');
var {promisify} = require('util');
var fetch = require('node-fetch');

if (process.argv.length < 2) {
  console.error(
    'Usage: node static-web-cast <config path> [cached file info JSON file path] > podcast.xml'
  );
  process.exit(1);
}

const configPath = process.argv[2];
var cachedFileInfoPath;

var cachedFileInfo = {};
if (process.argv.length > 3) {
  cachedFileInfoPath = path.join(__dirname, process.argv[3]);
  if (fs.existsSync(cachedFileInfoPath)) {
    cachedFileInfo = require(cachedFileInfoPath);
  }
}

var config = require(path.join(__dirname, configPath));
const metaDir = config.metaFilesLocation;
var mediaInfo;

((async function go() {
  try {
    mediaInfo = await MediaInfo();
  } catch (error) {
    logError(error);
    process.exit(1);
  } 
  var metaFiles = fs.readdirSync(metaDir).filter(isAnEntryMetaFile);
  //console.error('metaFiles', metaFiles);
  var q = queue();
  metaFiles.forEach(metaFile => q.defer(getAudioEntry, metaFile));
  q.awaitAll(oknok({ ok: makePodcastXML, nok: logError }));
})());

function logError(error, message = '') {
  console.error(message, error, error.stack);
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
      {language: config.language},
      {'itunes:image': { _attr: { href: config.podcastImageURL }}},
      {'itunes:owner': [
        { 'itunes:name': config.owner },
        { 'itunes:email': config.email }
      ]},
      {'itunes:category': [
        { _attr: { text: config.category }} ,
        {'itunes:category': { _attr: { text: config.subcategory } } }
      ]},
      {'itunes:explicit': config.explicit },
      {'itunes:subtitle': config.subtitle },
      {'itunes:summary': config.summary },
      {'itunes:author': config.author },
      {'itunes:type': config.podcastType },
    ] 
  };

  var feed = new RSS(rssFeedOpts);

  Promise
    .allSettled(entriesWithAudio.map(addToFeed))
    .then(doConcludingWrites)
    .catch(logError);

  function doConcludingWrites() {
    console.log(feed.xml({ indent: true }));
    if (Object.keys(cachedFileInfo).length > 0) {
      fs.writeFileSync(cachedFileInfoPath, JSON.stringify(cachedFileInfo, null, 2), { encoding: 'utf8' });
    }
  }

  async function addToFeed({ caption, mediaFilename, id, date }) {
    var duration, length;
    try {
      [ duration, length ] = await getDurationAndLength(config.mediaBaseURL, mediaFilename);
    } catch (error) {
      logError(error);
    }

    const postLink = `${config.baseURL}/${id}.html`;

    feed.item({
      title: caption.length > 80 ? caption.slice(0, 80) + '…' : caption,
      description: caption,
      link: postLink,
      guid: postLink,
      date,
      enclosure: {
        url: `${config.mediaBaseURL}/${encodeURIComponent(mediaFilename)}`,
        size: length
      },
      custom_elements: [
        { 'itunes:explicit': 'No' },
        { 'itunes:duration': duration },
        { 'itunes:episodeType': 'full' },
        {'itunes:author': config.author },
      ]
    });
  }
}

async function getDurationAndLength(baseURL, filename) {
  if (filename in cachedFileInfo) {
    return cachedFileInfo[filename];
  }

  const location = `${baseURL}/${filename}`;
  // TODO if it's ever needed: A version that looks for the file on the local file system.
  var duration = 0;
  var length = 0;
  // TODO: If you're ever going to have non-unique filenames, add a guid. Also, tmp dir config.
  const tmpPath = `./${filename}`;
  var wroteFile = false;
  try {
    var streamPipeline = promisify(pipeline);
    var res = await fetch(location);
    if (!res.ok) { throw new Error(`Unexpected response ${res.statusText}.`); }
    await streamPipeline(res.body, fs.createWriteStream(tmpPath));
    wroteFile = true;

    var fileHandle = await fs.promises.open(tmpPath);
    var stats = await fileHandle.stat(tmpPath);
    length = stats.size;
    var info = await mediaInfo.analyzeData(() => length, readChunk);
    duration = info?.media?.track?.[0]?.Duration ?? 0;
  } catch (error) {
    logError(error, 'Trouble trying to get a file duration.');
  } finally {
    if (fileHandle && wroteFile) {
      try {
        // You have to close the file before you can delete it.
        await fileHandle.close();
        await fs.promises.unlink(tmpPath);
      } catch (error) {
        logError(error, `[Sideshow Bob stepping on rake] Had problems cleaning up file at ${tmpPath}.`); 
      }
    }
  }

  cachedFileInfo[filename] = [duration, length];
  return cachedFileInfo[filename];

  async function readChunk(size, offset) {
    var buffer = new Uint8Array(size);
    try {
      await fileHandle.read(buffer, 0, size, offset);
      return buffer;
    } catch (error) {
      logError(error);
    }
    return buffer;
  }
}

