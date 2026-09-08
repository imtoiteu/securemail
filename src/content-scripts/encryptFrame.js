/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getUUID, normalizeArmored, encodeHTML, parseHTML} from '../lib/util';
import {FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED, PLAIN_TEXT} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import * as l10n from '../lib/l10n';
import {currentProvider} from './main';

import encryptContainerCSS from './encryptFrame.css';

l10n.register([
  'encrypt_frame_btn_label'
]);

l10n.mapToLocal();

export default class EncryptFrame {
  constructor() {
    this.id = getUUID();
    this.editElement = null;
    this.eFrame = null;
    this.port = null;
    this.emailTextElement = null;
    // type of external editor
    this.editorType = PLAIN_TEXT; //prefs.general.editor_type;
    this.keyCounter = 0;
    this.currentProvider = currentProvider;
    this.handleKeypress = this.handleKeypress.bind(this);
    this.setFrameDim = this.setFrameDim.bind(this);
  }

  attachTo(element) {
    this.init(element);
    this.establishConnection();
    this.registerEventListener();
    this.renderFrame();
  }

  init(element) {
    this.editElement = element;
    // set status to attached
    this.editElement.dataset[FRAME_STATUS] = FRAME_ATTACHED;
    this.emailTextElement = this.editElement.tagName.toLowerCase() === 'iframe' ? this.editElement.contentDocument.body : this.editElement;
  }

  establishConnection() {
    this.port = EventHandler.connect(`eFrame-${this.id}`, this);
    // attach extension unload handler
    this.port.onUninstall.addListener(this.closeFrame.bind(this, false));
  }

  registerEventListener() {
    // attach event handlers
    document.addEventListener('mailvelope-observe', this.setFrameDim);
    this.port.on('set-editor-output', this.setEditorOutput);
    this.port.on('destroy', this.closeFrame.bind(this, true));
    this.port.on('mail-editor-close', this.onMailEditorClose);
  }

  handleKeypress() {
    if (++this.keyCounter >= 13) {
      this.emailTextElement.removeEventListener('keypress', this.handleKeypress);
      this.eFrame.classList.remove('m-show');
      window.setTimeout(() => this.closeFrame(), 300);
    }
  }

  renderFrame() {
    // create frame
    this.eFrame = document.createElement('div');
    this.eFrame.id = `eFrame-${this.id}`;
    this.eFrame.classList.add('m-encrypt-frame');
    const encryptContainer = `<div class="m-encrypt-container"><a id="editorBtn" class="m-encrypt-button"><svg width="30px" height="30px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#1d4ed8"/><rect x="5" y="9" width="22" height="15" rx="2.5" fill="#ffffff"/><polyline points="6.5,10.5 16,17.5 25.5,10.5" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23" cy="20" r="3.2" fill="none" stroke="#1d4ed8" stroke-width="5"/><rect x="17.5" y="20" width="11" height="9" rx="2.2" fill="#1d4ed8"/><circle cx="23" cy="20" r="3.2" fill="none" stroke="#f59e0b" stroke-width="2"/><rect x="18.5" y="21" width="9" height="7.5" rx="1.8" fill="#f59e0b"/></svg><span>${l10n.map.encrypt_frame_btn_label}</span></a><button type="button" class="m-encrypt-close"><span class="icon-close"></span></button></div>`;
    this.eFrame.append(...parseHTML(encryptContainer));
    this.eFrame.querySelector('.m-encrypt-close').addEventListener('click', this.closeFrame.bind(this, false));
    this.eFrame.querySelector('#editorBtn').addEventListener('click', this.onEditorButton.bind(this));
    const shadowRootElem = document.createElement('div');
    this.editElement.parentNode.insertBefore(shadowRootElem, this.editElement.nextSibling);
    const eFrameShadow = shadowRootElem.attachShadow({mode: 'open'});
    const encryptContainerStyle = document.createElement('style');
    encryptContainerStyle.textContent = encryptContainerCSS;
    eFrameShadow.append(encryptContainerStyle);
    eFrameShadow.append(this.eFrame);
    window.addEventListener('resize', this.setFrameDim);
    // to react on position changes of edit element, e.g. click on CC or BCC in GMail
    this.normalizeButtons();
    this.eFrame.classList.add('m-show');
    this.emailTextElement.addEventListener('keypress', this.handleKeypress);
  }

  normalizeButtons() {
    this.eFrame.querySelector('.m-encrypt-container').classList.remove('active');
    this.setFrameDim();
  }

  onEditorButton(ev) {
    this.emailTextElement.removeEventListener('keypress', this.handleKeypress);
    this.eFrame.querySelector('.m-encrypt-container').classList.add('active');
    this.showMailEditor();
    ev.stopPropagation();
  }

  onMailEditorClose() {
    this.eFrame.querySelector('.m-encrypt-container').classList.remove('active');
  }

  closeFrame(finalClose, ev) {
    this.eFrame.classList.remove('m-show');
    window.setTimeout(() => {
      window.removeEventListener('resize', this.setFrameDim);
      this.eFrame.remove();
      if (finalClose === true) {
        this.port.disconnect();
        this.editElement.dataset[FRAME_STATUS] = '';
      } else {
        this.editElement.dataset[FRAME_STATUS] = FRAME_DETACHED;
      }
    }, 300);
    if (ev instanceof Event) {
      ev.stopPropagation();
    }
  }

  setFrameDim() {
    this.eFrame.style.top = `${this.editElement.offsetTop + 5}px`;
    this.eFrame.style.right = '20px';
  }

  async showMailEditor() {
    const options = {};
    const emailContent = this.getEmailText(this.editorType == PLAIN_TEXT ? 'text' : 'html');
    if (/BEGIN\sPGP\sMESSAGE/.test(emailContent)) {
      try {
        options.quotedMail = normalizeArmored(emailContent, /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/);
      } catch (e) {
        options.text = emailContent;
      }
    } else {
      options.text = emailContent;
    }
    options.recipients = await this.currentProvider.getRecipients(this.editElement);
    this.port.emit('eframe-display-editor', options);
  }

  getEmailText(type) {
    let text;
    let html;
    if (this.emailTextElement.tagName.toLowerCase() === 'textarea') {
      text = this.emailTextElement.value;
    } else { // html element
      if (type === 'text') {
        this.emailTextElement.focus();
        const sel = this.emailTextElement.ownerDocument.defaultView.getSelection();
        sel.selectAllChildren(this.emailTextElement);
        text = sel.toString();
        sel.removeAllRanges();
      } else {
        html = this.emailTextElement.innerHTML;
        html = html.replace(/\n/g, ''); // remove new lines
        text = html;
      }
    }
    return text;
  }

  /**
   * Is called after encryption and injects ciphertext and recipient
   * email addresses into the webmail interface.
   * @param {String} options.text         The encrypted message body
   * @param {Array}  options.to   The recipients to be added
   * @param {Array}  options.cc   The copy recipients to be added (not yet supported)
   */
  setEditorOutput(options) {
    // set message body
    this.normalizeButtons();
    this.setMessage(options.text);
    // set recipient email addresses
    this.currentProvider.setRecipients({recipients: options.to, editElement: this.editElement});
  }

  /**
   * Replace content of editor element (_emailTextElement)
   */
  setMessage(msg) {
    if (this.emailTextElement.tagName.toLowerCase() === 'textarea') {
      this.emailTextElement.value = msg;
    } else {
      // element is contenteditable or RTE
      // clear element first
      while (this.emailTextElement.firstChild) {
        this.emailTextElement.removeChild(this.emailTextElement.firstChild);
      }
      msg = `<pre>${encodeHTML(msg)}</pre>`;
      this.emailTextElement.append(...parseHTML(msg));
    }
    // trigger input event
    const inputEvent = document.createEvent('HTMLEvents');
    inputEvent.initEvent('input', true, true);
    this.emailTextElement.dispatchEvent(inputEvent);
  }
}
