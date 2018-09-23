# Legume Loader

An easy way to manage dependencies in vanilla JS. No bundler, just `import` statements.

## Usage

index.html:

```html
<html>
  <head>
    <script src=https://cdn.jsdelivr.net/npm/legume-loader@0.2.4/legume.min.js data-legume-entry=script.js></script>
  </head>
  <body>
    <div id=mydiv></div>
  </body>
</html>
```

script.js:

```js
import $ from "npm:jquery";
$("#mydiv").text("Now I can use jQuery!");
```

## Why is it called Legume?

I dunno, why are you bean so mean?

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- This is based off of, in concept, a previous project of mine,
  [bookmarklet-loader](https://github.com/coolreader18/bookmarklet-loader).
- Which in turn used a lot of code from [mrcoles/bookmarklet](https://github.com/mrcoles/bookmarklet).
  Legume uses no code from either project, but was inspired by it.
- Some code taken from [lukechilds/when-dom-ready](https://github.com/lukechilds/when-dom-ready),
  which is under the MIT license.
