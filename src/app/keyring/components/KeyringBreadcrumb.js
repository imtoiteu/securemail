/**
 * Copyright (C) 2026 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Link} from 'react-router-dom';
import * as l10n from '../../../lib/l10n';

l10n.register([
  'keyring_header'
]);

export default function KeyringBreadcrumb() {
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb bg-transparent p-0">
        <li className="breadcrumb-item">
          <Link to="/keyring" replace tabIndex="0">
            <span className="icon icon-arrow-left" aria-hidden="true"></span> {l10n.map.keyring_header}
          </Link>
        </li>
      </ol>
    </nav>
  );
}
