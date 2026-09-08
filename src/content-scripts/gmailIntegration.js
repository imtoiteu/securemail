/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */
import EventHandler from '../lib/EventHandler';
import {getUUID, parseHTML, parseViewName} from '../lib/util';
import {extractAddressFromText} from '../lib/email';
import {FRAME_STATUS, FRAME_ATTACHED} from '../lib/constants';
import * as l10n from '../lib/l10n';
import gmailIntegrationCsss from './gmailIntegration.css';
import {isAttached} from './main';
import AttachmentFrame from './attachmentFrame';

l10n.register([
  'encrypt_frame_btn_label',
  'provider_gmail_secure_reply_btn',
  'provider_gmail_secure_replyAll_btn',
  'provider_gmail_secure_forward_btn'
]);

const MSG_BODY_SELECTOR = '.a3s.aXjCH, .a3s.aiL';

export default class GmailIntegration {
  constructor() {
    this.id = getUUID();
    this.port = null;
    this.editorBtnRoot = null;
    this.editorBtn = null;
    this.selectedMsgs = null;
    this.userInfo = null;
    this.updateElements = this.updateElements.bind(this);
  }

  init() {
    this.establishConnection();
    this.registerEventListener();
    this.attachEditorBtn();
  }

  establishConnection() {
    this.port = EventHandler.connect(`gmailInt-${this.id}`, this);
    this.port.onUninstall.addListener(this.deactivate.bind(this));
  }

  registerEventListener() {
    document.addEventListener('mailvelope-observe', this.updateElements);
    this.port.on('update-message-data', this.onUpdateMessageData);
  }

  getUserInfo() {
    if (this.userInfo) {
      return this.userInfo;
    }
    const titleElem = document.querySelector('title');
    // Gmail titles place the active account address last, e.g.
    // "Inbox (5) - alice@example.com - Gmail". Take the last match so
    // subject-line addresses don't shadow the account address.
    const email = extractAddressFromText(titleElem.innerText, {position: 'last'});
    if (!email) {
      throw new Error('Gmail User Id not found.');
    }
    this.userInfo = {};
    this.userInfo.email = email;
    this.userInfo.legacyGsuite = Array.from(document.querySelectorAll('.aiG .aiD span')).some(element => /^1(?:5|7)[\sG]/.test(element.textContent));
    return this.userInfo;
  }

  getMsgId(msgElem) {
    const rawID = msgElem.dataset.messageId;
    return rawID[0] === '#' ? rawID.slice(1) : rawID;
  }

  onUpdateMessageData({msgId, data}) {
    const msg = this.selectedMsgs.get(msgId);
    this.selectedMsgs.set(msgId, {...msg, ...data});
    this.scanMessages();
  }

  getMsgByControllerId(controllerId) {
    if (!this.selectedMsgs) {
      return;
    }
    for (const [, value] of this.selectedMsgs) {
      if (value.controllerId === controllerId) {
        return value;
      }
    }
  }

  attachEditorBtn() {
    const nav = document.querySelector('.aIH') ?? document.querySelector('.aeN');
    if (!nav) {
      return;
    }
    if (nav.querySelector('.aic > .z0')) {
      // standard Gmail compose button
      const editorBtnRoot = nav.querySelector('.aic');
      if (isAttached(editorBtnRoot)) {
        return;
      }
      this.removeEditorButton();
      this.editorBtnRoot = editorBtnRoot;
      const editorBtnContainer = this.editorBtnRoot.querySelector('.z0');
      this.editorBtn = this.createEditorButton();
      editorBtnContainer.append(this.editorBtn);
      this.editorBtnRoot.style.overflow = 'hidden';
      this.editorBtnRoot.dataset[FRAME_STATUS] = FRAME_ATTACHED;
      return;
    }
    const compGmailBtn = nav.querySelector('.Yh.akV');
    if (compGmailBtn) {
      // Meet section active in main menu
      this.editorBtnRoot = compGmailBtn.parentElement;
      if (isAttached(this.editorBtnRoot)) {
        return;
      }
      this.editorBtn = this.createEditorButtonMeet(compGmailBtn);
      this.editorBtnRoot.insertBefore(this.editorBtn, compGmailBtn);
      this.editorBtnRoot.dataset[FRAME_STATUS] = FRAME_ATTACHED;
      return;
    }
  }

  createEditorButton() {
    const editorBtnElem = document.createElement('div');
    editorBtnElem.id = `gmailInt-${this.id}`;
    editorBtnElem.classList.add('mv-editor-btn-container');
    const btnElement = `<a id="editorBtn" class="mv-editor-btn" title="${l10n.map.encrypt_frame_btn_label}"><div class="mv-editor-btn-content"><svg width="24px" height="24px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#1d4ed8"/><rect x="5" y="9" width="22" height="15" rx="2.5" fill="#ffffff"/><polyline points="6.5,10.5 16,17.5 25.5,10.5" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23" cy="20" r="3.2" fill="none" stroke="#1d4ed8" stroke-width="5"/><rect x="17.5" y="20" width="11" height="9" rx="2.2" fill="#1d4ed8"/><circle cx="23" cy="20" r="3.2" fill="none" stroke="#f59e0b" stroke-width="2"/><rect x="18.5" y="21" width="9" height="7.5" rx="1.8" fill="#f59e0b"/></svg></div></a>`;
    editorBtnElem.append(...parseHTML(btnElement));
    editorBtnElem.querySelector('#editorBtn').addEventListener('click', this.onEditorButton.bind(this));
    const editorBtn = document.createElement('div');
    editorBtn.style.display = 'inline-flex';
    editorBtn.style.flexShrink = 0;
    editorBtn.style.alignItems = 'center';
    editorBtn.style.justifyContent = 'center';
    editorBtn.style.width = '48px';
    editorBtn.style.height = '48px';
    editorBtn.style.marginLeft = '12px';
    const editorBtnShadow = editorBtn.attachShadow({mode: 'open'});
    const editorBtnStyle = document.createElement('style');
    editorBtnStyle.textContent = gmailIntegrationCsss;
    editorBtnShadow.append(editorBtnStyle);
    editorBtnShadow.append(editorBtnElem);
    return editorBtn;
  }

  createEditorButtonMeet(compGmailBtn) {
    const gmailStyle = window.getComputedStyle(compGmailBtn);
    const editorBtn = document.createElement('div');
    editorBtn.style.marginRight = '10px';
    editorBtn.tabIndex = 0;
    editorBtn.type = 'button';
    editorBtn.dataset.tooltip = 'Mailvelope Editor';
    editorBtn.style.backgroundColor = gmailStyle.backgroundColor;
    editorBtn.style.borderRadius = '50%';
    editorBtn.style.boxShadow = gmailStyle.boxShadow;
    editorBtn.style.height = '40px';
    editorBtn.style.minWidth = '40px';
    editorBtn.addEventListener('click', this.onEditorButton.bind(this));
    const editorBtnShadow = editorBtn.attachShadow({mode: 'open'});
    const logo = document.createElement('div');
    logo.style.height = '40px';
    logo.style.width = '40px';
    logo.style.backgroundSize = '20px';
    logo.style.backgroundPosition = 'center';
    logo.style.backgroundRepeat = 'no-repeat';
    logo.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTZweCIgaGVpZ2h0PSIxNnB4IiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMxZDRlZDgiLz48cmVjdCB4PSI1IiB5PSI5IiB3aWR0aD0iMjIiIGhlaWdodD0iMTUiIHJ4PSIyLjUiIGZpbGw9IiNmZmZmZmYiLz48cG9seWxpbmUgcG9pbnRzPSI2LjUsMTAuNSAxNiwxNy41IDI1LjUsMTAuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWQ0ZWQ4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjIzIiBjeT0iMjAiIHI9IjMuMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWQ0ZWQ4IiBzdHJva2Utd2lkdGg9IjUiLz48cmVjdCB4PSIxNy41IiB5PSIyMCIgd2lkdGg9IjExIiBoZWlnaHQ9IjkiIHJ4PSIyLjIiIGZpbGw9IiMxZDRlZDgiLz48Y2lyY2xlIGN4PSIyMyIgY3k9IjIwIiByPSIzLjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2Y1OWUwYiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTguNSIgeT0iMjEiIHdpZHRoPSI5IiBoZWlnaHQ9IjcuNSIgcng9IjEuOCIgZmlsbD0iI2Y1OWUwYiIvPjwvc3ZnPg==)';
    editorBtnShadow.append(logo);
    return editorBtn;
  }

  async scanMessages() {
    const msgs = document.querySelectorAll('[data-message-id]');
    const currentMsgs = new Map();
    for (const msgElem of msgs) {
      const msgData = {};
      const msgId = this.getMsgId(msgElem);
      const mvFrame = msgElem.querySelector(`[data-mvelo-frame="${FRAME_ATTACHED}"]`);
      if (mvFrame) {
        const {id, type} = this.getControllerDetails(mvFrame);
        msgData.controllerId = id;
        msgData.controllerType = type;
      }
      const selected = this.selectedMsgs && this.selectedMsgs.get(msgId);
      if (selected) {
        selected.controllerId = msgData.controllerId || selected.controllerId;
        currentMsgs.set(msgId, selected);
        if (selected.controllerType === 'dFrame' || selected.clipped || selected.secureAction) {
          this.addBottomBtns(msgId, msgElem);
        }
        continue;
      }
      if (this.hasClippedArmored(msgElem)) {
        msgData.clipped = true;
      }
      msgData.att = this.getEncryptedAttachments(msgElem);
      if (!msgData.controllerId && (msgData.clipped || msgData.att.length)) {
        const aFrame = new AttachmentFrame();
        msgData.controllerId = aFrame.id;
        msgData.controllerType = aFrame.mainType;
        const containerElem = msgElem.querySelector('.ii.gt');
        aFrame.attachTo(containerElem);
        if (msgData.att.length) {
          msgData.plainText = this.getPlainText(msgElem);
        }
        if (msgData.clipped || msgData.plainText) {
          const bodyElem = containerElem.querySelector(MSG_BODY_SELECTOR);
          bodyElem.style.display = 'none';
          msgData.hiddenElem = bodyElem;
        }
      }
      if (msgData.controllerId) {
        msgData.msgId = msgId;
        // add top and menu buttons
        this.attachMsgBtns(msgId, msgElem, msgData);
        // add bottom buttons in case of decryp frame
        if (msgData.controllerType === 'dFrame' || msgData.clipped) {
          this.addBottomBtns(msgId, msgElem);
        }
        currentMsgs.set(msgId, msgData);
      }
    }
    this.selectedMsgs = currentMsgs;
  }

  getControllerDetails(frameElem) {
    const eframe = frameElem.lastChild.shadowRoot.querySelector('.m-extract-frame');
    return {id: parseViewName(eframe.id).id, type: eframe.dataset.mvControllerType};
  }

  hasClippedArmored(msgElem) {
    const clipped = msgElem.querySelector('.iX a');
    if (clipped && clipped.href.includes('view=lg')) {
      const msgText = msgElem.querySelector(MSG_BODY_SELECTOR).innerText;
      return /BEGIN\sPGP\sMESSAGE/.test(msgText);
    }
    return false;
  }

  getPlainText(msgElem) {
    const {innerText} = msgElem.querySelectorAll('.ii.gt')[0];
    return /\S/.test(innerText) ? innerText : '';
  }

  getEncryptedAttachments(msgElem) {
    const attachmentElems = msgElem.querySelectorAll('.aV3');
    const regex = /.*\.(gpg|pgp|asc)/;
    const attachments = [];
    for (const attachmentElem of attachmentElems) {
      const fileName = attachmentElem.innerText;
      if (fileName && regex.test(fileName)) {
        attachments.push(fileName);
      }
    }
    return attachments;
  }

  attachMsgBtns(msgId, msgElem, msgData) {
    // add top buttons
    const actionBtnsTopRoot = msgElem.querySelector('td.acX.bAm');
    const secureReplyBtn = document.createElement('div');
    secureReplyBtn.classList.add('mv-reply-btn-top');
    secureReplyBtn.setAttribute('title', l10n.map.provider_gmail_secure_reply_btn);
    secureReplyBtn.setAttribute('tabindex', 0);
    secureReplyBtn.setAttribute('role', 'button');
    secureReplyBtn.setAttribute('aria-label', l10n.map.provider_gmail_secure_reply_btn);
    secureReplyBtn.addEventListener('click', ev => this.onSecureButton(ev, 'reply', msgId));
    const secureReplyBtnShadowRootElem = document.createElement('div');
    secureReplyBtnShadowRootElem.dataset.mvBtnTop = 'reply';
    secureReplyBtnShadowRootElem.style.display = 'inline-flex';
    actionBtnsTopRoot.prepend(secureReplyBtnShadowRootElem);
    const secureReplyBtnShadow = secureReplyBtnShadowRootElem.attachShadow({mode: 'open'});
    const secureReplyBtnStyle = document.createElement('style');
    secureReplyBtnStyle.textContent = gmailIntegrationCsss;
    secureReplyBtnShadow.append(secureReplyBtnStyle);
    secureReplyBtnShadow.append(secureReplyBtn);
    // add menu items - TODO: improve click handler as it fails attaching the secure buttons to the menu in some rare cases
    const menuBtn = actionBtnsTopRoot.querySelector('.T-I-Js-Gs.aap.T-I-awG');
    if (menuBtn) {
      menuBtn.dataset.mvMenuBtns = FRAME_ATTACHED;
      msgData.menuMouseDownHandler = () => {
        this.menuPopover = document.querySelector('.b7.J-M[role="menu"]');
        setTimeout(() => {
          this.addMenuBtn('reply', this.menuPopover, null, ev => this.onSecureButton(ev, 'reply', msgId));
          const replyMenuItem = this.menuPopover.querySelector('[role="menuitem"][id="r2"]');
          if (replyMenuItem.style.display !== 'none') {
            this.addMenuBtn('replyAll', this.menuPopover, replyMenuItem, ev => this.onSecureButton(ev, 'reply', msgId, true));
          }
          this.addMenuBtn('forward', this.menuPopover, this.menuPopover.querySelector('[role="menuitem"][id="r3"]'), ev => this.onSecureButton(ev, 'forward', msgId));
        }, !this.menuPopover.hasChildNodes() ? 50 : 0);
      };
      menuBtn.addEventListener('mousedown', msgData.menuMouseDownHandler, {capture: true});
      msgData.menuBlurHandler = () => {
        this.cleanupMenuBtns();
      };
      menuBtn.addEventListener('blur', msgData.menuBlurHandler, {capture: true});
    }
  }

  addBottomBtns(msgId, msgElem) {
    const bottomBtnsContainer = msgElem.nextSibling;
    if (bottomBtnsContainer) {
      if (bottomBtnsContainer.querySelector('[data-mv-btns-bottom]')) {
        return;
      }
      const actionBtnsBottom = bottomBtnsContainer.querySelectorAll('span.ams[role="link"]');
      if (actionBtnsBottom.length) {
        let parent;
        let hasReplyAllBtn = false;
        for (const btn of actionBtnsBottom) {
          if (!parent) {
            parent = btn.parentElement;
          }
          if (btn.classList.contains('bkI')) {
            hasReplyAllBtn = true;
          }
          btn.style.display = 'none';
        }
        const actionBtnsBottomShadowRootElem = document.createElement('div');
        actionBtnsBottomShadowRootElem.dataset.mvBtnsBottom = FRAME_ATTACHED;
        parent.prepend(actionBtnsBottomShadowRootElem);
        const actionBtnsBottomElem = document.createElement('div');
        actionBtnsBottomElem.classList.add('mv-action-btns-bottom');
        this.addBottomBtn('reply', actionBtnsBottomElem, ev => this.onSecureButton(ev, 'reply', msgId));
        if (hasReplyAllBtn) {
          this.addBottomBtn('replyAll', actionBtnsBottomElem, ev => this.onSecureButton(ev, 'reply', msgId, true));
        }
        this.addBottomBtn('forward', actionBtnsBottomElem, ev => this.onSecureButton(ev, 'forward', msgId));
        const actionBtnsBottomShadow = actionBtnsBottomShadowRootElem.attachShadow({mode: 'open'});
        const actionBtnsBottomStyle = document.createElement('style');
        actionBtnsBottomStyle.textContent = gmailIntegrationCsss;
        actionBtnsBottomShadow.append(actionBtnsBottomStyle);
        actionBtnsBottomShadow.append(actionBtnsBottomElem);
      }
    }
  }

  addBottomBtn(name, container, clickHandler) {
    const secureActionBtnBottom = document.createElement('span');
    secureActionBtnBottom.classList.add('mv-action-btn-bottom', `mv-action-btn-bottom-${name}`);
    secureActionBtnBottom.textContent = l10n.map[`provider_gmail_secure_${name}_btn`];
    secureActionBtnBottom.addEventListener('click', clickHandler);
    container.append(secureActionBtnBottom);
  }

  addMenuBtn(name, container, beforeElem, clickHandler) {
    let menuItemShadowRootElem = container.querySelector(`[data-mv-menu-item="${name}"]`);
    let secureMenuItemShadow;
    if (!menuItemShadowRootElem) {
      menuItemShadowRootElem = document.createElement('div');
      menuItemShadowRootElem.dataset.mvMenuItem = name;
      menuItemShadowRootElem.setAttribute('role', 'menuitem');
      container.insertBefore(menuItemShadowRootElem, beforeElem || container.firstChild);
      const secureMenuItem = document.createElement('div');
      secureMenuItem.classList.add('mv-menu-item', `mv-menu-item-${name}`);
      secureMenuItem.textContent = l10n.map[`provider_gmail_secure_${name}_btn`];
      secureMenuItemShadow = menuItemShadowRootElem.attachShadow({mode: 'open'});
      const secureMenuItemStyle = document.createElement('style');
      secureMenuItemStyle.textContent = gmailIntegrationCsss;
      secureMenuItemShadow.append(secureMenuItemStyle);
      secureMenuItemShadow.append(secureMenuItem);
    } else {
      secureMenuItemShadow = menuItemShadowRootElem.shadowRoot;
      const cloned = secureMenuItemShadow.lastChild.cloneNode(true);
      secureMenuItemShadow.replaceChild(cloned, secureMenuItemShadow.lastChild);
    }
    secureMenuItemShadow.lastChild.addEventListener('click', clickHandler, {once: true});
  }

  cleanupMenuBtns() {
    if (this.menuPopover) {
      this.menuPopover.querySelectorAll('[data-mv-menu-item]').forEach(node => node.parentNode && node.parentNode.removeChild(node));
    }
  }

  async updateElements() {
    this.attachEditorBtn();
    await this.scanMessages();
  }

  onCloseFrame(controllerId) {
    const message = this.getMsgByControllerId(controllerId);
    if (message && message.hiddenElem) {
      message.hiddenElem.style.display = 'block';
    }
  }

  deactivate() {
    document.removeEventListener('mailvelope-observe', this.updateElements);
    this.removeElements();
    this.selectedMsgs = null;
  }

  removeElements() {
    this.removeEditorButton();
    if (this.selectedMsgs) {
      for (const {msgId, menuClickHandler, menuBlurHandler, clipped, hiddenElem} of this.selectedMsgs.values()) {
        const msgElem = document.querySelector(`[data-message-id="#${msgId}"]`);
        if (!msgElem) {
          continue;
        }
        msgElem.querySelectorAll('[data-mv-btn-top]').forEach(node => node.parentNode && node.parentNode.removeChild(node));
        const menuBtnElem = msgElem.querySelector('[data-mv-menu-btns]');
        if (menuBtnElem) {
          menuBtnElem.removeEventListener('click', menuClickHandler, true);
          menuBtnElem.removeEventListener('blur', menuBlurHandler, true);
          menuBtnElem.removeAttribute('data-mv-menu-btns');
        }
        if (clipped) {
          const bodyElem = msgElem.querySelector(MSG_BODY_SELECTOR);
          bodyElem.style.display = 'block';
        }
        if (hiddenElem) {
          hiddenElem.style.display = 'block';
        }
      }
    }
    const btnsBottomElem = document.querySelector('[data-mv-btns-bottom]');
    if (btnsBottomElem) {
      const parent = btnsBottomElem.parentNode;
      if (parent) {
        parent.removeChild(btnsBottomElem);
        parent.querySelectorAll('span.ams[role="link"]').forEach(node => node.style.display = 'inline-flex');
      }
    }
    this.cleanupMenuBtns();
  }

  removeEditorButton() {
    if (this.editorBtn) {
      this.editorBtn.parentNode && this.editorBtn.parentNode.removeChild(this.editorBtn);
      this.editorBtnRoot.removeAttribute('data-mvelo-frame');
      this.editorBtnRoot.style.overflow = 'inherit';
    }
  }

  onEditorButton(ev) {
    this.editorBtn.blur();
    this.port.emit('open-editor', {userInfo: this.getUserInfo()});
    ev.stopPropagation();
  }

  onSecureButton(ev, type, msgId, all = false) {
    this.port.emit('secure-button', {type, msgId, all, userInfo: this.getUserInfo()});
    ev.stopPropagation();
  }
}
