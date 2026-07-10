/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2018-2019 Mailvelope GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Custom HTML elements that wrap the client-API for declarative use in markup.
 * Each element is registered as an HTML custom element when the client-API
 * script loads, so they can be authored directly as HTML tags — no JavaScript
 * needed beyond optional event listeners.
 *
 * @module web-components
 */

/**
 * Custom HTML element that renders a signed, encrypted form. Wraps
 * {@link Mailvelope#createEncryptedFormContainer} so partners can embed an
 * encrypted form declaratively in HTML instead of via JavaScript.
 *
 * The form definition is provided as the `innerText` of a single child
 * `<script>` element. The signature attribute carries the OpenPGP signature
 * over that definition. On submit, the element dispatches an `encrypt` event
 * whose `detail.armoredData` is the encrypted form payload.
 *
 * @memberof module:web-components
 * @hideconstructor
 * @element openpgp-encrypted-form
 *
 * @attr {string} id - Required. Unique identifier used as the iframe container target.
 * @attr {string} [signature] - OpenPGP signature over the embedded form definition.
 *
 * @fires connected - Dispatched once the element is attached to the document.
 * @fires encrypt - Dispatched on successful encryption.
 *   `event.detail.armoredData` ({@link AsciiArmored}) holds the encrypted payload.
 * @fires error - Standard `ErrorEvent`. `event.error.code` may be one of:
 *   `NO_FORM_ID` (id attribute missing), `NO_FORM_SCRIPT` (no child `<script>`
 *   with form template), or any error code raised by
 *   {@link Mailvelope#createEncryptedFormContainer} (e.g. `INVALID_FORM`).
 *
 * @example
 * <openpgp-encrypted-form id="contact-form" signature="-----BEGIN PGP SIGNATURE-----...">
 *   <script type="text/template">
 *     <form data-recipient="contact@example.com">
 *       <input type="text" name="name">
 *       <input type="email" name="email">
 *       <textarea name="message"></textarea>
 *       <button type="submit">Send</button>
 *     </form>
 *   </script>
 * </openpgp-encrypted-form>
 * <script>
 *   document.getElementById('contact-form').addEventListener('encrypt', e => {
 *     console.log(e.detail.armoredData);
 *   });
 * </script>
 */
class OpenPGPEncryptedForm extends HTMLElement {
  /** @private */
  connectedCallback() {
    this.dispatchEvent(new Event('connected'));
    const id = this.getAttribute('id');
    if (!id) {
      const error = new Error('No form id for openpgp-encrypted-tag. Please add a unique identifier.');
      error.code = 'NO_FORM_ID';
      return this.onError(error);
    }
    let html;
    const scriptTags = this.getElementsByTagName('script');
    if (scriptTags.length) {
      html = scriptTags[0].innerText;
    } else {
      const error = new Error('No form template for openpgp-encrypted-tag. Please add a form template.');
      error.code = 'NO_FORM_SCRIPT';
      return this.onError(error);
    }
    window.mailvelope.createEncryptedFormContainer(`#${id}`, html, this.getAttribute('signature'))
    .then(data => this.onEncrypt(data), error => this.onError(error));
  }

  /** @private */
  onEncrypt(data) {
    this.dispatchEvent(new CustomEvent('encrypt', {
      detail: {armoredData: data.armoredData},
      bubbles: true,
      cancelable: true
    }));
  }

  /** @private */
  onError(error) {
    this.dispatchEvent(new ErrorEvent('error', {
      message: error.message,
      error
    }));
  }
}

/**
 * Custom HTML element that renders the decrypted content of an encrypted mail.
 * Wraps {@link Mailvelope#createDisplayContainer} for declarative use.
 *
 * The armored PGP message is supplied either through a child
 * `<template class="armored">` (preferred for multi-line bodies) or via the
 * `data-armored` attribute.
 *
 * @memberof module:web-components
 * @hideconstructor
 * @element openpgp-email-read
 *
 * @attr {string} id - Required. Unique identifier used as the iframe container target.
 * @attr {string} [data-armored] - {@link AsciiArmored} PGP message. Used when no
 *   `<template class="armored">` child is present.
 * @attr {string} [data-sender-address] - Sender email address. Used to identify
 *   the key for signature verification.
 *
 * @fires ready - Dispatched once the decrypted container has been mounted.
 * @fires error - Standard `ErrorEvent`. `event.error.code` may be any code
 *   raised by {@link Mailvelope#createDisplayContainer} — for example
 *   `DECRYPT_ERROR`, `ARMOR_PARSE_ERROR`, `PWD_DIALOG_CANCEL`, `NO_KEY_FOUND`.
 *
 * @example
 * <openpgp-email-read id="msg" data-sender-address="alice@example.com">
 *   <template class="armored">-----BEGIN PGP MESSAGE-----
 * ...
 * -----END PGP MESSAGE-----</template>
 * </openpgp-email-read>
 */
class OpenPGPEmailRead extends HTMLElement {
  /** @private */
  connectedCallback() {
    const id = this.getAttribute('id');
    if (!id) {
      return this.onError(new Error('Missing id attribute on openpgp-email-read tag. Please add a unique identifier.'));
    }
    const [armoredElement] = this.getElementsByClassName('armored');
    const armored = armoredElement ? armoredElement.textContent : this.dataset.armored;
    if (!armored) {
      return this.onError(new Error('Armored message required as <template class="armored"> child element or data-armored attribute.'));
    }
    const options = {senderAddress: this.dataset.senderAddress};
    if (window.mailvelope) {
      this.createContainer(id, armored, options);
    } else {
      window.addEventListener('mailvelope', () => this.createContainer(id, armored, options), {once: true});
    }
  }

  /** @private */
  async createContainer(id, armored, options) {
    try {
      const {error} = await window.mailvelope.createDisplayContainer(`#${id}`, armored, null, options);
      if (error) {
        return this.onError(error);
      }
      this.onReady();
    } catch (e) {
      this.onError(e);
    }
  }

  /** @private */
  onReady() {
    this.dispatchEvent(new CustomEvent('ready', {bubbles: true, cancelable: true}));
  }

  /** @private */
  onError(error) {
    this.dispatchEvent(new ErrorEvent('error', {message: error.message, error}));
  }
}

/**
 * Custom HTML element that renders the Mailvelope editor for composing a new
 * encrypted mail. Wraps {@link Mailvelope#createEditorContainer} for declarative use.
 *
 * An armored draft and/or a quoted mail can be supplied through child
 * `<template>` elements. All `data-*` attributes are forwarded as editor
 * options (see {@link EditorContainerOptions}); boolean options follow the
 * standard HTML boolean-attribute convention (presence = true, regardless of value).
 *
 * @memberof module:web-components
 * @hideconstructor
 * @element openpgp-email-write
 *
 * @attr {string} id - Required. Unique identifier used as the iframe container target.
 * @attr {string} [data-quota] - Mail content limit in kilobytes (default: 20480).
 * @attr {string} [data-sign-msg] - Presence of the attribute enables signing
 *   (HTML boolean-attribute style; the attribute value is ignored).
 * @attr {string} [data-keep-attachments] - Presence of the attribute keeps
 *   attachments from the quoted mail in the editor.
 * @attr {string} [data-predefined-text] - Initial text to load into the editor.
 * @attr {string} [data-quoted-mail-indent] - Indent quoted mail (default: true).
 * @attr {string} [data-quoted-mail-header] - Header inserted before the quoted mail.
 *
 * @fires ready - Dispatched once the editor has been mounted.
 *   `event.detail.editor` is the {@link Editor} instance used for `encrypt()`
 *   and `createDraft()`.
 * @fires error - Standard `ErrorEvent`. `event.error.code` may be any code
 *   raised by {@link Mailvelope#createEditorContainer} — for example
 *   `WRONG_ARMORED_TYPE` or `INVALID_OPTIONS`.
 *
 * @example
 * <openpgp-email-write id="compose" data-sign-msg data-quota="10240">
 *   <template class="quoted-mail">-----BEGIN PGP MESSAGE-----
 * ...
 * -----END PGP MESSAGE-----</template>
 * </openpgp-email-write>
 * <script>
 *   document.getElementById('compose').addEventListener('ready', e => {
 *     const editor = e.detail.editor;
 *     document.getElementById('send').addEventListener('click', () => {
 *       editor.encrypt(['bob@example.com']).then(armored => console.log(armored));
 *     });
 *   });
 * </script>
 */
class OpenPGPEmailWrite extends HTMLElement {
  /** @private */
  connectedCallback() {
    const id = this.getAttribute('id');
    if (!id) {
      return this.onError(new Error('Missing id attribute on openpgp-email-write tag. Please add a unique identifier.'));
    }
    const [armoredDraftElement] = this.getElementsByClassName('armored-draft');
    const armoredDraft = armoredDraftElement ? armoredDraftElement.textContent : undefined;
    const [quotedMailElement] = this.getElementsByClassName('quoted-mail');
    const quotedMail = quotedMailElement ? quotedMailElement.textContent : undefined;
    let {quota, signMsg, keepAttachments} = this.dataset;
    quota = quota ? Number(quota) : undefined;
    signMsg = signMsg || signMsg === '' ? true : false;
    keepAttachments = keepAttachments || keepAttachments === '' ? true : false;
    const options = {armoredDraft, quotedMail, ...this.dataset, quota, signMsg, keepAttachments};
    if (window.mailvelope) {
      this.createEditor(id, options);
    } else {
      window.addEventListener('mailvelope', () => this.createEditor(id, options), {once: true});
    }
  }

  /** @private */
  async createEditor(id, options) {
    try {
      this.editor = await window.mailvelope.createEditorContainer(`#${id}`, null, options);
      this.onReady(this.editor);
    } catch (e) {
      this.onError(e);
    }
  }

  /** @private */
  onReady(editor) {
    this.dispatchEvent(new CustomEvent('ready', {bubbles: true, cancelable: true, detail: {editor}}));
  }

  /** @private */
  onError(error) {
    this.dispatchEvent(new ErrorEvent('error', {message: error.message, error}));
  }
}

/** @private */
export function init() {
  // See. https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements#Specification#Browser_compatibility
  if (!window.customElements) {
    return;
  }
  window.customElements.define('openpgp-encrypted-form', OpenPGPEncryptedForm);
  window.customElements.define('openpgp-email-read', OpenPGPEmailRead);
  window.customElements.define('openpgp-email-write', OpenPGPEmailWrite);
}
