## API Functions

### `Legume()`

Takes a string that is parsed into a url, and that's sent to Legume.run.

### `Legume.load()`

Takes a module, sets it up in the cache and some other stuff regarding it.

### `Legume.run()`

Takes a module, loads it if not already loaded, and requires/runs it.

### `Legume.require()`

Requires a module as if from a script and returns it.

## Miscellaneous

It should check mime-type and determine whether to load as a script or stylesheet

Querystrings in requests instead of other request formats; e.g. instead of `xxx@ver` do `xxx?v=ver`
