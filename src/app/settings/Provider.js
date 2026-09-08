/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import {port, getAppDataSlot} from '../app';
import {matchPattern2RegExString} from '../../lib/util';
import {ERROR_GMAIL_ACCOUNT_MISMATCH} from '../../lib/constants';
import * as l10n from '../../lib/l10n';
import Trans from '../../components/util/Trans';
import Alert from '../../components/util/Alert';
import Modal from '../../components/util/Modal';

import './Provider.scss';

const GMAIL_SCOPE_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_SCOPE_SEND = 'https://www.googleapis.com/auth/gmail.send';

l10n.register([
  'alert_header_important',
  'alert_header_notice',
  'alert_header_warning',
  'dashboard_link_manage_domains',
  'dialog_popup_close',
  'keygrid_refresh',
  'keygrid_user_email',
  'learn_more_link',
  'provider_gmail_auth',
  'provider_gmail_auth_cancel_btn',
  'provider_gmail_auth_readonly',
  'provider_gmail_auth_send',
  'provider_gmail_auth_table_title',
  'provider_gmail_dialog_auth_google_signin',
  'provider_gmail_dialog_auth_intro',
  'provider_gmail_dialog_auth_outro',
  'provider_gmail_dialog_description',
  'provider_gmail_dialog_privacy_policy',
  'provider_gmail_dialog_title',
  'provider_gmail_integration',
  'provider_gmail_integration_info',
  'provider_gmail_integration_warning',
  'provider_gmail_mismatch_cancel_btn',
  'provider_gmail_mismatch_intro',
  'provider_gmail_mismatch_label_actual',
  'provider_gmail_mismatch_label_expected',
  'provider_gmail_mismatch_retry_btn',
  'provider_gmail_mismatch_step1',
  'provider_gmail_mismatch_step2',
  'provider_gmail_mismatch_title',
  'provider_gmail_mismatch_why_body',
  'provider_gmail_mismatch_why_summary',
  'settings_provider',
  'watchlist_title_scan'
]);

const GMAIL_MATCH_PATTERN = '*.mail.google.com';

export default class Provider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gmail: false, // Gmail registered in authorized domains
      gmail_integration: false,
      gmail_authorized_emails: [],
      email: '',
      legacyGsuite: false,
      scopes: [],
      gmailCtrlId: '',
      watchList: null,
      mismatch: null
    };
    this.handleGmailSwitch = this.handleGmailSwitch.bind(this);
    this.handleMismatchRetry = this.handleMismatchRetry.bind(this);
    this.handleMismatchCancel = this.handleMismatchCancel.bind(this);
  }

  async componentDidMount() {
    await this.loadPrefs();
    if (/\/auth$/.test(this.props.location.pathname)) {
      const data = await getAppDataSlot();
      this.openOAuthDialog(data);
    }
  }


  openOAuthDialog({email, legacyGsuite, scopes, gmailCtrlId}) {
    this.setState({showAuthModal: true, email, legacyGsuite, scopes, gmailCtrlId});
  }

  async getAuthorization({forcePicker = false} = {}) {
    const {email, legacyGsuite, scopes, gmailCtrlId} = this.state;
    try {
      this.setState({showAuthModal: false, mismatch: null});
      await port.send('authorize-gmail', {email, legacyGsuite, scopes, gmailCtrlId, forcePicker});
      await this.loadAuthorisations();
    } catch (error) {
      if (error.code === ERROR_GMAIL_ACCOUNT_MISMATCH && error.data) {
        this.setState({
          mismatch: {
            intendedEmail: error.data.intendedEmail || email,
            actualEmail: error.data.actualEmail || ''
          }
        });
        return;
      }
      this.props.onSetNotification({header: l10n.map.alert_header_warning, message: error.message, type: 'error', hideDelay: 10000});
    }
  }

  handleMismatchRetry() {
    this.getAuthorization({forcePicker: true});
  }

  handleMismatchCancel() {
    const {gmailCtrlId} = this.state;
    this.setState({mismatch: null, gmail_integration: false}, () => this.handleSave());
    if (gmailCtrlId) {
      port.emit('cancel-authorize-gmail', {gmailCtrlId});
    }
  }

  getAuthText(authorisation) {
    let text;
    switch (authorisation) {
      case GMAIL_SCOPE_READONLY:
        text = l10n.map.provider_gmail_auth_readonly;
        break;
      case GMAIL_SCOPE_SEND:
        text = l10n.map.provider_gmail_auth_send;
        break;
      default:
        text = '';
    }
    return text;
  }

  async loadPrefs() {
    const {provider} = await port.send('get-prefs');
    const gmail = await this.verifyHost(GMAIL_MATCH_PATTERN);
    this.setState({
      gmail,
      gmail_integration: provider.gmail_integration
    });
    await this.loadAuthorisations();
  }

  async verifyHost(host) {
    if (!this.state.watchList) {
      await this.loadWatchList();
    }
    const regex = new RegExp(matchPattern2RegExString(host));
    const match = this.state.watchList.some(({active, frames}) => active && frames.some(({scan, frame}) => scan && regex.test((frame))));
    return match;
  }

  async loadAuthorisations() {
    let gmailOAuthTokens = await port.send('get-oauth-tokens', {provider: 'gmail'});
    if (gmailOAuthTokens) {
      gmailOAuthTokens = Object.keys(gmailOAuthTokens).map(key => ({...gmailOAuthTokens[key], email: key}));
    } else {
      gmailOAuthTokens = [];
    }
    this.setState({gmail_authorized_emails: gmailOAuthTokens});
  }

  async loadWatchList() {
    const watchList = await port.send('getWatchList');
    return new Promise(resolve => this.setState({watchList}, resolve));
  }

  async removeAuthorisation(email) {
    await port.send('remove-oauth-token', {provider: 'gmail', email});
    await this.loadAuthorisations();
  }


  handleGmailSwitch({target}) {
    this.setState({[target.name]: target.checked}, () => this.handleSave());
  }

  async handleSave() {
    const update = {
      provider: {
        gmail_integration: this.state.gmail_integration,
      }
    };
    await port.send('set-prefs', {prefs: update});
  }

  handleCancel() {
    this.loadPrefs();
  }

  authModal() {
    return (
      <Modal
        isOpen={this.state.showAuthModal}
        toggle={() => this.setState(prevState => ({showAuthModal: !prevState.showAuthModal}))}
        size="medium"
        title={l10n.map.provider_gmail_dialog_title}
        footer={
          <div className="modal-footer justify-content-between">
            <button type="button" className="btn btn-secondary" onClick={() => this.setState({showAuthModal: false, gmail_integration: false}, () => this.handleSave())}>{l10n.map.dialog_popup_close}</button>
            {this.googleSignInButton()}
          </div>
        }
      >
        <>
          <p><span>{l10n.map.provider_gmail_dialog_description}</span> <a href="https://github.com/imtoiteu/securemail/tree/internal-stable-v1/docs/internal" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a></p>
          <p><Trans id={l10n.map.provider_gmail_dialog_auth_intro} components={[<strong key="0">{this.state.email}</strong>]} /></p>
          <ul>
            {this.state.scopes.map((entry, index) =>
              <li key={index}>
                {this.getAuthText(entry)}
              </li>
            )}
          </ul>
          <p><Trans id={l10n.map.provider_gmail_dialog_auth_outro} components={[<strong key="0">{this.state.email}</strong>]} /></p>
          <p className="text-muted text-right mb-0">
            <small>
              <a href="https://github.com/imtoiteu/securemail/tree/internal-stable-v1/docs/internal" className="text-reset" target="_blank" rel="noopener noreferrer">{l10n.map.provider_gmail_dialog_privacy_policy}</a>
            </small>
          </p>
        </>
      </Modal>
    );
  }

  googleSignInButton() {
    return (
      <button type="button" className="gSignInButton gSignInButtonBlue" onClick={() => this.getAuthorization()}>
        <div className="gSignInButtonContentWrapper">
          <div className="gSignInButtonIcon">
            <img width="18px" height="18px" className="gSignInButtonSvg" src="../../../img/btn_google_sign_in.svg" />
          </div>
          <span className="gSignInButtonContents">
            <span>{l10n.map.provider_gmail_dialog_auth_google_signin}</span>
          </span>
        </div>
      </button>
    );
  }

  mismatchModal() {
    const {mismatch} = this.state;
    const intended = mismatch?.intendedEmail || '';
    const actual = mismatch?.actualEmail || '';
    const rows = [
      {modifier: 'expected', icon: 'icon-checkmark', label: l10n.map.provider_gmail_mismatch_label_expected, email: intended},
      {modifier: 'actual', icon: 'icon-close', label: l10n.map.provider_gmail_mismatch_label_actual, email: actual}
    ];
    return (
      <Modal
        isOpen={Boolean(mismatch)}
        toggle={this.handleMismatchCancel}
        size="medium"
        title={l10n.map.provider_gmail_mismatch_title}
        headerClass="text-danger"
        footer={
          <div className="modal-footer justify-content-between">
            <button type="button" className="btn btn-secondary" onClick={this.handleMismatchCancel}>{l10n.map.provider_gmail_mismatch_cancel_btn}</button>
            <button type="button" className="btn btn-primary" onClick={this.handleMismatchRetry}>{l10n.map.provider_gmail_mismatch_retry_btn}</button>
          </div>
        }
      >
        <div className="account-mismatch">
          <p className="account-mismatch__intro">{l10n.map.provider_gmail_mismatch_intro}</p>
          <div className="account-mismatch__compare">
            {rows.map(({modifier, icon, label, email}) => (
              <div key={modifier} className={`account-mismatch__row account-mismatch__row--${modifier}`}>
                <span className={`icon ${icon} account-mismatch__icon`} aria-hidden="true"></span>
                <span className="account-mismatch__label">{label}</span>
                <span className="account-mismatch__email">{email}</span>
              </div>
            ))}
          </div>
          <ol className="account-mismatch__steps">
            <li>{l10n.map.provider_gmail_mismatch_step1}</li>
            <li><Trans id={l10n.map.provider_gmail_mismatch_step2} components={[<strong key="0">{intended}</strong>]} /></li>
          </ol>
          <details className="account-mismatch__details">
            <summary>{l10n.map.provider_gmail_mismatch_why_summary}</summary>
            <p>{l10n.map.provider_gmail_mismatch_why_body}</p>
          </details>
        </div>
      </Modal>
    );
  }


  render() {
    return (
      <div id="provider">
        <h2 className="mb-4">{l10n.map.settings_provider}</h2>
        <form>
          <div className="form-group mb-4">
            <div className="custom-control custom-switch">
              <input className="custom-control-input" disabled={!this.state.gmail} type="checkbox" id="gmail_integration" name="gmail_integration" checked={this.state.gmail_integration} onChange={this.handleGmailSwitch} />
              <label className="custom-control-label" htmlFor="gmail_integration"><span>{l10n.map.provider_gmail_integration}</span></label>
            </div>
            {!this.state.gmail && (
              <Alert className="mt-2" type="warning" header={l10n.map.alert_header_warning}>
                <Trans id={l10n.map.provider_gmail_integration_warning} components={[
                  <strong key="0">{GMAIL_MATCH_PATTERN}</strong>,
                  <Link key="1" to="/settings/watchlist">{l10n.map.dashboard_link_manage_domains}</Link>
                ]} />
              </Alert>
            )}
            {this.state.gmail && (
              <Alert className="mt-2" type="info" header={l10n.map.alert_header_important}>
                {l10n.map.provider_gmail_integration_info} <a href="https://github.com/imtoiteu/securemail/tree/internal-stable-v1/docs/internal" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a>
              </Alert>
            )}
            <p className="lead mt-3">{l10n.map.provider_gmail_auth_table_title}</p>
            <div className="table-responsive">
              <table className="table table-provider table-custom mb-0">
                <thead>
                  <tr>
                    <th>{l10n.map.keygrid_user_email}</th>
                    <th>{l10n.map.provider_gmail_auth}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.gmail_authorized_emails.map((entry, index) =>
                    <tr key={index}>
                      <td>{entry.email}</td>
                      <td>{entry.scope.split(' ').map(val => this.getAuthText(val)).filter(val => val !== '').join(', ')}</td>
                      <td className="text-center">
                        <div className="actions">
                          <button type="button" onClick={() => this.removeAuthorisation(entry.email)} className="btn btn-sm btn-secondary">{l10n.map.provider_gmail_auth_cancel_btn}</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </form>
        {this.authModal()}
        {this.mismatchModal()}
      </div>
    );
  }
}

Provider.propTypes = {
  location: PropTypes.object,
  onSetNotification: PropTypes.func
};
