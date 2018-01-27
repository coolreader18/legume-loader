# Legume Loader
An easy way to manage dependencies in vanilla JS. No bundler, no browserify, just JavaScript comments.
## Usage
index.html:
```html
<html>
<head>
  <script
  src=https://cdn.jsdelivr.net/gh/coolreader18/legume-loader@latest/legume.min.js
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
 * @version 1.0.0
 * @script https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
 */
$("#mydiv").text("Now I can use jQuery!");
```

## Why is it called Legume?
I dunno, why are you bean so mean?

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
* This is based off of, both in concept and in a fair amount of code, a previous project of mine, [bookmarklet-loader](https://github.com/coolreader18/bookmarklet-loader).
* Which in turn used a lot of code from [mrcoles/bookmarklet](https://github.com/mrcoles/bookmarklet). Legume uses very little actual code from there, but the project was inspired by it.
