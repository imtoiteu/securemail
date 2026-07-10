import PropTypes from 'prop-types';
import React, {useEffect, useRef, useState} from 'react';
import {Button, Fade, Modal, ModalBody, ModalFooter, ModalHeader} from 'reactstrap';
import Alert from '../../../components/util/Alert';
import * as l10n from '../../../lib/l10n';
import {port} from '../../app';
import {getFileSize} from '../../util/util';

l10n.register([
  'keybackup_dialog_headline',
  'keybackup_load_error',
  'key_gen_success',
  'keybackup_backup_description',
  'keybackup_backup_store_location',
  'dialog_no_button',
  'form_back',
  'keybackup_save_button',
  'keybackup_keep_safe_headline',
  'keybackup_keep_safe_text',
  'keybackup_done_button'
]);

/**
 * @param {KeyDetailsProps} props
 */
function KeyDetails({type, name, email, keyId}) {
  return (
    <>
      <p className="mb-1">{l10n.map.key_gen_success}:</p>
      <Alert type="info" className="mb-3 flex-shrink-1">
        <span className={`icon icon-${type === 'public' ? 'key' : 'key-pair'} mr-1`}></span>
        <span>{name}</span> <span className="text-muted">{`<${email}>`}</span><br />
        {`#${keyId}`}
      </Alert>
    </>
  );
}
/**
 * @typedef {Object} KeyDetailsProps
 * @property {'public' | 'key-pair'} type
 * @property {string} name
 * @property {string} email
 * @property {string} keyId
 */
KeyDetails.propTypes = {
  type: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  keyId: PropTypes.string.isRequired,
};

/**
 * Read-only row showing the backup file and its size.
 * @param {{name: string, sizeStr: string}} props
 */
function DownloadRow({name, sizeStr}) {
  return (
    <div className="d-flex align-items-center border rounded p-2">
      <span className="icon icon-download mr-2" style={{fontSize: '1.25rem'}}></span>
      <span className="flex-grow-1 text-truncate">{name}</span>
      <small className="text-muted ml-2 flex-shrink-0">{sizeStr}</small>
    </div>
  );
}
DownloadRow.propTypes = {
  name: PropTypes.string.isRequired,
  sizeStr: PropTypes.string.isRequired,
};

/**
 * @param {{
 *  isOpen: boolean,
 *  keyId: string,
 *  keyFpr: string,
 *  keyringId: string,
 *  onClose: () => void
 * }} props
 */
function KeyBackup({isOpen, keyId, keyFpr, keyringId, onClose}) {
  const [keyDetails, setKeyDetails] = useState(null);
  const [keyExported, setKeyExported] = useState(false);
  const [fileInfo, setFileInfo] = useState({name: '', url: '', sizeStr: ''});
  const [loadError, setLoadError] = useState(false);
  // holds the latest object URL so cleanup can revoke it without depending on fileInfo state
  const objectUrlRef = useRef('');

  useEffect(() => {
    if (isOpen && keyFpr && keyringId) {
      const fetchKey = async () => {
        try {
          setLoadError(false);
          const [[key], details] = await Promise.all([
            port.send('getArmoredKeys', {
              keyringId,
              keyFprs: keyFpr,
              options: {pub: true, priv: true, all: false},
            }),
            port.send('getKeyDetails', {
              keyringId,
              fingerprint: keyFpr,
            }),
          ]);
          if (!key || !key.armoredPrivate || !key.armoredPublic) {
            throw new Error('Key not found or invalid');
          }
          const armoredExport = `${key.armoredPrivate}\n${key.armoredPublic}`;
          const userEmail = details.users[0].email;
          setKeyDetails({
            type: 'key-pair',
            name: details.users[0].name,
            email: userEmail,
            keyId,
          });
          const fileName = `${userEmail}-backup.asc`;
          const file = new File(
            [armoredExport],
            fileName,
            {type: 'application/pgp-keys'}
          );
          objectUrlRef.current = window.URL.createObjectURL(file);
          setFileInfo({
            name: fileName,
            url: objectUrlRef.current,
            sizeStr: getFileSize(file.size)
          });
        } catch (error) {
          console.error('Failed to fetch armored keys:', error);
          setLoadError(true);
        }
      };
      fetchKey();
    }

    return () => {
      if (objectUrlRef.current) {
        window.URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
  }, [isOpen, keyId, keyFpr, keyringId]);

  const fileReady = Boolean(fileInfo.url);

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
    >
      <ModalHeader toggle={onClose}>
        {l10n.map.keybackup_dialog_headline}
      </ModalHeader>
      <ModalBody>
        {keyExported ? (
          <Fade key="saved">
            <p className="mb-1 font-weight-bold">
              <span className="icon icon-lock mr-1"></span>{l10n.map.keybackup_keep_safe_headline}
            </p>
            <p>{l10n.map.keybackup_keep_safe_text}</p>
            {fileReady && <DownloadRow name={fileInfo.name} sizeStr={fileInfo.sizeStr} />}
          </Fade>
        ) : (
          <Fade key="info">
            {loadError && <Alert type="danger" className="mb-3">{l10n.map.keybackup_load_error}</Alert>}
            {keyDetails && <KeyDetails {...keyDetails} />}
            <p>{l10n.map.keybackup_backup_description}</p>
            <Alert type="warning" className="mb-3">{l10n.map.keybackup_backup_store_location}</Alert>
            {fileReady && <DownloadRow name={fileInfo.name} sizeStr={fileInfo.sizeStr} />}
          </Fade>
        )}
      </ModalBody>
      <ModalFooter>
        {keyExported ? (
          <div className="btn-bar justify-content-between w-100">
            <Button onClick={() => setKeyExported(false)}>{l10n.map.form_back}</Button>
            <Button color="primary" onClick={onClose}>{l10n.map.keybackup_done_button}</Button>
          </div>
        ) : (
          <div className="btn-bar justify-content-between w-100">
            <Button onClick={onClose}>{l10n.map.dialog_no_button}</Button>
            <a
              className={`btn btn-primary ${fileReady ? '' : 'disabled'}`}
              download={fileInfo.name}
              href={fileInfo.url}
              role="button"
              aria-disabled={!fileReady}
              onClick={event => {
                if (!fileReady) {
                  event.preventDefault();
                  return;
                }
                setKeyExported(true);
              }}
            >{l10n.map.keybackup_save_button}</a>
          </div>
        )}
      </ModalFooter>
    </Modal>
  );
}

KeyBackup.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  keyId: PropTypes.string.isRequired,
  keyFpr: PropTypes.string.isRequired,
  keyringId: PropTypes.string.isRequired,
  onClose: PropTypes.func,
};

export default KeyBackup;
