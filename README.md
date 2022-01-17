# static-web-cast

A tool that goes through your [static-web-archive](https://github.com/jimkang/static-web-archive) entries, finds ones with audio in them, then creates a podcast feed from them.

## Installing

    npm i static-web-cast

## Usage

    ./node_modules/.bin/static-web-cast your-config.js your-file-info-cache.json > your-new-podcast-feed.xml

Where your config file looks like this:

      module.exports = {
        metaFilesLocation: 'blog/meta', // Where your static-web-archive meta files are in the file system.
        baseURL: 'https://your-new-podcast.com', // Where's the feed xml file going to be?
        rssFilename: 'your-new-podcast-feed.xml',
        podcastImageURL: 'https://someting.com/podcast.jpg',
        mediaBaseURL: 'https://your-new-podcast.com/audio',
        language: 'en',
        owner: 'Smidgeo',
        email: 'smidgeo@fastmail.com',
        category: 'Education',
        subcategory: 'Self-Improvement',
        explicit: 'No',
        subtitle: 'Casting pods from you.',
        summary: 'The audio part of your static-web-archive — now in your podcast app!',
        author: 'you',
        podcastType: 'episodic'
      };

There's an example in [testbed/test-config.js](testbed/test-config.js).

The second param, your-file-info-cache.json, is where you want static-web-cast to both keep a cache of the info in gets from your audio files and where you want it to read from. This optional, but it will build your podcast feed much faster in which there's a lot of episodes it looked at in previous runs and only one new episode. This is because it takes a secord or so on most computers to grab the media file from the internet (this is because it doesn't assume you are building the feed from the same computer that hosts the media), then decode it and get the play duration.

### Testing

There aren't real tests, but you can run `make try`, then look in testbed/output. It should generate a valid podcast XML feed.
