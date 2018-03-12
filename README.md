# Legume Loader

An easy way to manage dependencies in vanilla JS. No bundler, no browserify, just JavaScript comments.

## Usage

index.html:

```html
<html>
<head>
  <script
  src=https://cdn.jsdelivr.net/npm/legume-loader@0.2.4/legume.min.js
  data-legume-entry=script.js></script>
</head>
<body>
  <div id=mydiv>
  </div>
</body>
</html>
```

script.js:

```javascript
/* @legume
 * @name my-script
 * @require npm:jquery@3.3.1
 */
$("#mydiv").text("Now I can use jQuery!");
```

## Why is it called Legume?

I dunno, why are you bean so mean?

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

* This is based off of, in concept and some code, a previous project of mine, [bookmarklet-loader](https://github.com/coolreader18/bookmarklet-loader).
* Which in turn used a lot of code from [mrcoles/bookmarklet](https://github.com/mrcoles/bookmarklet). Legume uses very little code from there, I think at this point just the code for iterating throught the lines of a script, but the project was inspired by it.
