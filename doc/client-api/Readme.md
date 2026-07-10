# Mailvelope Client-API

The Mailvelope browser extension injects a script into the page that exposes the
client-API on `window.mailvelope`. This object is an instance of the
[Mailvelope](Mailvelope.html) class — start there for the full method reference.

For declarative HTML use, see the custom elements documented under
[Modules → web-components](module-web-components.html).

## Basic Usage

The extension may load before or after your page script runs. Use the
`mailvelope` event together with a presence check to obtain the API reliably:

```js
function mailvelopeLoaded() {
  // window.mailvelope is now available
}

if (window.mailvelope) {
  mailvelopeLoaded();
} else {
  window.addEventListener('mailvelope', mailvelopeLoaded, {once: true});
}
```

## Events

### `mailvelope`

Fired on `window` once `window.mailvelope` becomes available.

### `mailvelope-disconnect`

Fired during an update of the extension. Auto-updates can happen at any time,
after which any Mailvelope containers on the page stop working. Use the event
to warn users about potential data loss (relevant for the editor) and to
trigger a page reload.

```js
window.addEventListener('mailvelope-disconnect', event => {
  // event.detail.version is the version of the updated extension
});
```

## Promises and errors

All client-API methods return Promises. Errors that surface as promise
rejections are documented with `@throws` on the corresponding method — look
for an `error.code` listed in the method's documentation to handle the failure.

## Demo application

A working integration is available at
[mailvelope/mailvelope-api-test](https://github.com/mailvelope/mailvelope-api-test).
It exercises the full surface against a live Mailvelope install and is the
quickest way to see end-to-end usage in one place:

- [`mailvelope-manual-test.js`](https://github.com/mailvelope/mailvelope-api-test/blob/master/public/javascripts/mailvelope-manual-test.js)
  — JavaScript client-API (keyrings, display/editor containers, sync handlers).
- [`mailvelope-wc-test.js`](https://github.com/mailvelope/mailvelope-api-test/blob/master/public/javascripts/mailvelope-wc-test.js)
  — declarative HTML via the [web components](module-web-components.html).
