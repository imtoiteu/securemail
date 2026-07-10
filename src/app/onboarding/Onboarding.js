/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {useState} from 'react';
import {Route, useHistory} from 'react-router-dom';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import {MAIN_KEYRING_ID, SETUP_SKIPPED} from '../../lib/constants';
import {port} from '../app';
import {KeyringOptions} from '../keyring/KeyringOptions';
import KeyringSetup from '../keyring/KeyringSetup';
import GnupgFooter from '../keyring/GnupgFooter';
import GenerateKey from '../keyring/GenerateKey';
import KeyImport from '../keyring/KeyImport';
import OnboardingSuccess from './OnboardingSuccess';
import FAQSidebar from '../../components/util/FAQSidebar';
import Notifications from '../../components/util/Notifications';

import './Onboarding.scss';

l10n.register([
  'onboarding_welcome_title',
  'onboarding_setup_alert',
  'onboarding_create_key_hint',
  'onboarding_import_key_hint',
  'onboarding_skip',
  'keyring_setup_generate_key',
  'keyring_setup_import_key',
  'onboarding_gnupg_alternative_heading',
  'onboarding_gnupg_alternative',
  'onboarding_faq_what_is_key',
  'onboarding_faq_backup',
  'onboarding_faq_should_upload_key',
  'onboarding_faq_export_keys',
  'onboarding_faq_forget_password',
  'onboarding_faq_where_key_stored'
]);

const setupFaqItems = [
  {labelKey: 'onboarding_faq_what_is_key', url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/USER_GUIDE_GMAIL_VI.md'},
  {labelKey: 'onboarding_faq_backup', url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/USER_GUIDE_GMAIL_VI.md'},
  {labelKey: 'onboarding_faq_where_key_stored', url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/USER_GUIDE_GMAIL_VI.md'}
];

const generateFaqItems = [
  {labelKey: 'onboarding_faq_what_is_key', url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/USER_GUIDE_GMAIL_VI.md'},
  {labelKey: 'onboarding_faq_should_upload_key', url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/USER_GUIDE_GMAIL_VI.md'},
  {labelKey: 'onboarding_faq_where_key_stored', url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/USER_GUIDE_GMAIL_VI.md'}
];

const importFaqItems = [
  {labelKey: 'onboarding_faq_export_keys', url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/USER_GUIDE_GMAIL_VI.md'},
  {labelKey: 'onboarding_faq_forget_password', url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/USER_GUIDE_GMAIL_VI.md'},
  {labelKey: 'onboarding_faq_where_key_stored', url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/USER_GUIDE_GMAIL_VI.md'}
];

function resolveFaqItems(items) {
  return items.map(({labelKey, url}) => ({label: l10n.map[labelKey], url}));
}

function OnboardingPage({title, alert, sidebar, onSkip, children}) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">{title}</h2>
        {onSkip && <button type="button" className="btn btn-secondary px-4" onClick={onSkip}>{l10n.map.onboarding_skip}</button>}
      </div>
      {alert && <div className="alert alert-success mb-4" role="alert">{alert}</div>}
      {sidebar ? (
        <div className="row">
          <div className="col-lg-8 col-xl-9">{children}</div>
          {sidebar}
        </div>
      ) : children}
    </>
  );
}

OnboardingPage.propTypes = {
  title: PropTypes.string,
  alert: PropTypes.string,
  sidebar: PropTypes.node,
  onSkip: PropTypes.func,
  children: PropTypes.node
};

export default function Onboarding() {
  const history = useHistory();
  const [notifications, setNotifications] = useState([]);
  const handleNotification = notification => setNotifications([notification]);

  const handleGenerated = ({uploaded}) => {
    history.push(`/onboarding/success?action=generate&uploaded=${uploaded ? '1' : '0'}`);
  };

  const handleImported = () => {
    history.push('/onboarding/success?action=import');
  };

  const handleSkip = async () => {
    await port.send('set-session-pref', {key: SETUP_SKIPPED, value: true});
    history.push('/dashboard');
  };

  return (
    <KeyringOptions.Provider value={{keyringId: MAIN_KEYRING_ID, demail: false, gnupg: false}}>
      <div className="jumbotron">
        <section className="card">
          <div className="card-body">
            <Route exact path="/onboarding" render={() => (
              <OnboardingPage
                title={l10n.map.onboarding_welcome_title}
                alert={l10n.map.onboarding_setup_alert}
                sidebar={<FAQSidebar items={resolveFaqItems(setupFaqItems)} />}
                onSkip={handleSkip}
              >
                <KeyringSetup generatePath="/onboarding/generate" importPath="/onboarding/import" />
                <GnupgFooter heading={l10n.map.onboarding_gnupg_alternative_heading} body={l10n.map.onboarding_gnupg_alternative} />
              </OnboardingPage>
            )} />
            <Route path="/onboarding/generate" render={() => (
              <OnboardingPage
                title={l10n.map.keyring_setup_generate_key}
                alert={l10n.map.onboarding_create_key_hint}
                sidebar={<FAQSidebar items={resolveFaqItems(generateFaqItems)} />}
              >
                <GenerateKey
                  onGenerateComplete={handleGenerated}
                  onNotification={handleNotification}
                  cancelTo="/onboarding"
                />
              </OnboardingPage>
            )} />
            <Route path="/onboarding/import" render={({location}) => (
              <OnboardingPage
                title={l10n.map.keyring_setup_import_key}
                alert={l10n.map.onboarding_import_key_hint}
                sidebar={<FAQSidebar items={resolveFaqItems(importFaqItems)} />}
              >
                <KeyImport
                  onImportComplete={handleImported}
                  onNotification={handleNotification}
                  location={location}
                  cancelTo="/onboarding"
                />
              </OnboardingPage>
            )} />
            <Route path="/onboarding/success" component={OnboardingSuccess} />
          </div>
        </section>
      </div>
      <Notifications items={notifications} hideDelay={5000} />
    </KeyringOptions.Provider>
  );
}
