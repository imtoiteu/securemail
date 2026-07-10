/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link, useLocation} from 'react-router-dom';
import * as l10n from '../../lib/l10n';
import FAQSidebar from '../../components/util/FAQSidebar';

l10n.register([
  'onboarding_success_title',
  'onboarding_success_message',
  'onboarding_success_alert',
  'onboarding_success_alert_alt',
  'action_menu_setup_start_label',
  'onboarding_success_created_key_title',
  'onboarding_success_created_key_text',
  'onboarding_success_imported_key_title',
  'onboarding_success_imported_key_text',
  'onboarding_success_need_help',
  'onboarding_success_help_user_guide',
  'onboarding_success_help_install',
  'onboarding_success_help_others'
]);

function helpItems() {
  return [
    {label: l10n.map.onboarding_success_help_user_guide, url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/USER_GUIDE_GMAIL_VI.md'},
    {label: l10n.map.onboarding_success_help_install, url: 'https://github.com/imtoiteu/securemail/blob/internal-stable-v1/docs/internal/INSTALL_CHROME_EDGE_VI.md'},
    {label: l10n.map.onboarding_success_help_others, url: 'https://github.com/imtoiteu/securemail/tree/internal-stable-v1/docs/internal'}
  ];
}

function StepList({text}) {
  return (
    <ol className="onboarding-steps">
      {text.split('\n').map((step, i) => <li key={i}>{step}</li>)}
    </ol>
  );
}

StepList.propTypes = {
  text: PropTypes.string.isRequired
};

export default function OnboardingSuccess() {
  const query = new URLSearchParams(useLocation().search);
  const action = query.get('action');
  const uploaded = query.get('uploaded') === '1';
  const showKeyServerCopy = action === 'generate' && uploaded;

  return (
    <>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="mb-3 flex-grow-1">{l10n.map.onboarding_success_title}</h2>
          <h4 className="mb-4">{l10n.map.onboarding_success_message}</h4>
        </div>
        <div className="w-50 alert alert-success d-none d-md-flex justify-content-between align-items-center onboarding-success-alert" role="alert">
          <span>{l10n.map.onboarding_success_alert}</span>
          <img
            className="m-2"
            src="../img/extension-location.svg"
            alt={l10n.map.onboarding_success_alert_alt}
          />
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 col-xl-9">
          {showKeyServerCopy ? (
            <div className="mb-4">
              <h3 className="mb-4">{l10n.map.onboarding_success_created_key_title}</h3>
              <StepList text={l10n.map.onboarding_success_created_key_text} />
            </div>
          ) : (
            <div className="mb-4">
              <h3 className="mb-4">{l10n.map.onboarding_success_imported_key_title}</h3>
              <StepList text={l10n.map.onboarding_success_imported_key_text} />
            </div>
          )}
        </div>
        <FAQSidebar items={helpItems()} titleKey="onboarding_success_need_help" />
        <div className="d-flex justify-content-center my-4 w-100">
          <Link to="/dashboard" className="btn btn-primary btn-lg">
            {l10n.map.action_menu_setup_start_label}
          </Link>
        </div>
      </div>
    </>
  );
}
