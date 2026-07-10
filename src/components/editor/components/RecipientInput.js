/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import PropTypes from 'prop-types';
import React, {useRef, useMemo} from 'react';
// `WithContext` as `ReactTags` is taken from the official example
import {WithContext as ReactTags} from 'react-tag-input';
import * as l10n from '../../../lib/l10n';
import {encodeHTML, getUUID} from '../../../lib/util';
import {findKeyByEmail, hasAnyUnresolvedRecipient, isValidAddress} from '../../../lib/email';

import './RecipientInput.scss';

l10n.register([
  'editor_key_has_extra_msg',
  'editor_key_not_found',
  'editor_key_not_found_msg'
]);

function getTagClassName(recipient, keys, hasExtraKey) {
  if (recipient.key || findKeyByEmail(keys, recipient.email)) {
    return 'badge-success';
  }
  if (recipient.lookupPending) {
    return 'badge-pending';
  }
  return hasExtraKey ? 'badge-info' : 'badge-danger';
}

function recipientToTag(recipient, keys, hasExtraKey) {
  return {
    id: recipient.email,
    text: recipient.displayId || recipient.email,
    className: getTagClassName(recipient, keys, hasExtraKey)
  };
}

function tagToRecipient(tag, keys) {
  if (!tag || !tag.id) {
    return;
  }
  const recipient = {email: tag.id, displayId: tag.id};
  const key = findKeyByEmail(keys, recipient.email);
  if (key) {
    recipient.key = key;
    recipient.fingerprint = key.fingerprint;
  } else {
    recipient.checkServer = true;
    recipient.lookupPending = true;
  }
  return recipient;
}

export function RecipientInput({extraKey, hideErrorMsg, keys, recipients, onChangeRecipients}) {
  const idRef = useRef(getUUID());

  const tags = useMemo(
    () => recipients.map(r => recipientToTag(r, keys, extraKey)),
    [recipients, keys, extraKey]
  );

  const updateParentRecipients = nextTags => onChangeRecipients(nextTags.map(t => tagToRecipient(t, keys)));

  const onDelete = tagIndex => updateParentRecipients(tags.filter((_, i) => i !== tagIndex));

  const onAddition = newTag => {
    if (!isValidAddress(newTag.id)) {
      return;
    }
    updateParentRecipients([...tags, newTag]);
    // <ReactTags> exposes neither its input element nor a focus API, so we
    // re-focus by querying for it after the parent state update lands.
    setTimeout(() => {
      const inputElem = document.querySelector(`[id="${idRef.current}"] .tag-input-field`);
      inputElem?.focus();
    }, 0);
  };

  const onFilterSuggestions = (textInputValue, possibleSuggestionsArray) => {
    const lowerCaseQuery = textInputValue.toLowerCase();
    return possibleSuggestionsArray
    .filter(suggestion => suggestion.text.toLowerCase().includes(lowerCaseQuery))
    .slice(0, 10);
  };

  const suggestions = keys
  .filter(key => !tags.find(tag => tag.id === key.email))
  .map(key => ({
    id: key.email,
    text: `${key.userId} - ${key.keyId}`,
  }));

  const renderSuggestion = ({text}, query) => {
    query = query.trim();
    let html = text.replaceAll(query, `<mark>${query}</mark>`);
    html = encodeHTML(html);
    html = html.replaceAll('&lt;mark&gt;', '<mark>').replaceAll('&lt;&#x2F;mark&gt;', '</mark>'); // decode mark tag
    return <span dangerouslySetInnerHTML={{__html: html}} />;
  };

  const showNotFoundAlert = !hideErrorMsg && !extraKey && hasAnyUnresolvedRecipient(recipients, keys);
  const showExtraKeyAlert = extraKey && !recipients.some(r => r.lookupPending);

  return (
    <div id={idRef.current} className="mb-0">
      <ReactTags
        tags={tags}
        suggestions={suggestions}
        renderSuggestion = {renderSuggestion}
        handleDelete={onDelete}
        handleAddition={onAddition}
        handleFilterSuggestions={onFilterSuggestions}
        placeholder={null}
        allowDragDrop={false}
        minQueryLength={1}
        separators={['Enter', 'Tab', 'Space']}
        classNames={{
          tags: 'recipients-input mb-0 form-control',
          tagInput: 'tag-input-wrapper flex-grow-1',
          tagInputField: 'tag-input-field m-0 p-0',
          selected: 'tag-selected-list d-flex flex-wrap',
          tag: 'tag badge',
          remove: 'tag-remove',
          suggestions: 'suggestions d-block dropdown-menu',
          activeSuggestion: 'active-suggestion dropdown-item:hover'
        }} />
      {showNotFoundAlert && (
        <div className="alert alert-danger mt-2 mb-0" role="alert">
          <strong>{l10n.map.editor_key_not_found}</strong> <span>{l10n.map.editor_key_not_found_msg}</span>
        </div>
      )}
      {showExtraKeyAlert && (
        <div className="alert alert-info mt-2 mb-0" role="alert">
          <span>{l10n.map.editor_key_has_extra_msg}</span>
        </div>
      )}
    </div>
  );
}

RecipientInput.propTypes = {
  extraKey: PropTypes.bool,
  hideErrorMsg: PropTypes.bool,
  keys: PropTypes.array,
  onChangeRecipients: PropTypes.func,
  recipients: PropTypes.array
};
