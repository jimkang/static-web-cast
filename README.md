# static-web-cast

A tool that goes through your [static-web-archive](https://github.com/jimkang/static-web-archive) entries, finds ones with audio in them, then creates a podcast feed from them.

## Installing

    npm i -g static-web-cast --registry https://npm.pkg.github.com/jimkang

## Usage

    swcast <directory with meta files>

### Parameters

- directory with meta files: The directory containing files, each of which is a JSON dictionary containing a metadatum about a weblog entry. By default, static-web-archive stores these in the `meta/` under the root of your archive directory. [Example metadatum.](testbed/meta/deathmtn-sqTtXnEA.json)

### Testing

There aren't real tests, but you can run `make try`, then look in testbed/output. It should generate a valid podcast XML feed.
