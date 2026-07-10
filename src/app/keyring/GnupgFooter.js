/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import * as l10n from '../../lib/l10n';

l10n.register([
  'general_openpgp_preferences'
]);

export default function GnupgFooter({heading, body}) {
  return (
    <div className="mt-4">
      <h5 className="font-weight-bold">{heading}</h5>
      <p>{body} <Link to="/settings/general" className="text-primary">{l10n.map.general_openpgp_preferences}</Link></p>
    </div>
  );
}

GnupgFooter.propTypes = {
  heading: PropTypes.string,
  body: PropTypes.string
};
