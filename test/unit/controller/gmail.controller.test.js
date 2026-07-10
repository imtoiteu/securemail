import GmailController from '../../../src/controller/gmail.controller';
import * as gmail from '../../../src/modules/gmail';
import {createMockPort} from '../__mocks__/port';

jest.mock('../../../src/lib/EventHandler', () => require('../__mocks__/lib/EventHandler').default);
jest.mock('../../../src/lib/lib-mvelo', () => require('../__mocks__/lib/lib-mvelo').default);
jest.mock('../../../src/controller/sub.controller', () => require('../__mocks__/controller/sub.controller').default);
jest.mock('../../../src/modules/gmail', () => ({
  authorize: jest.fn(),
  checkLicense: jest.fn(),
  GMAIL_SCOPE_READONLY: 'readonly',
  GMAIL_SCOPE_SEND: 'send'
}));
jest.mock('../../../src/lib/email', () => ({
  formatAddress: jest.fn(),
  parseAddress: jest.fn(),
  parseAddressList: jest.fn()
}));

describe('GmailController.onAuthorize', () => {
  let controller;

  beforeEach(() => {
    controller = new GmailController(createMockPort('gmailController-1'));
    controller.tabId = 1;
    controller.activateComponent = jest.fn();
    controller.checkLicense = jest.fn();
  });

  it('forwards forcePicker to gmail.authorize', async () => {
    gmail.authorize.mockResolvedValue('access-token');
    controller.authorizationRequest = {resolve: jest.fn(), reject: jest.fn()};
    await controller.onAuthorize({email: 'a@example.com', legacyGsuite: false, scopes: [], forcePicker: true});
    expect(gmail.authorize).toHaveBeenCalledWith('a@example.com', false, [], {forcePicker: true});
    expect(controller.authorizationRequest.resolve).toHaveBeenCalledWith('access-token');
  });

  it('keeps the pending authorization request open on GMAIL_ACCOUNT_MISMATCH', async () => {
    const err = Object.assign(new Error('mismatch'), {code: 'GMAIL_ACCOUNT_MISMATCH', data: {intendedEmail: 'a@example.com', actualEmail: 'b@example.com'}});
    gmail.authorize.mockRejectedValue(err);
    const reject = jest.fn();
    const resolve = jest.fn();
    controller.authorizationRequest = {resolve, reject};
    await expect(controller.onAuthorize({email: 'a@example.com', legacyGsuite: false, scopes: []})).rejects.toBe(err);
    expect(reject).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('rejects the authorization request on terminal errors', async () => {
    const err = Object.assign(new Error('boom'), {code: 'GOOGLE_OAUTH_ERROR'});
    gmail.authorize.mockRejectedValue(err);
    const reject = jest.fn();
    controller.authorizationRequest = {resolve: jest.fn(), reject};
    await expect(controller.onAuthorize({email: 'a@example.com', legacyGsuite: false, scopes: []})).rejects.toBe(err);
    expect(reject).toHaveBeenCalledWith(err);
  });

  it('cancelAuthorization rejects and clears the pending request', () => {
    const reject = jest.fn();
    controller.authorizationRequest = {resolve: jest.fn(), reject};
    controller.cancelAuthorization();
    expect(reject).toHaveBeenCalled();
    expect(controller.authorizationRequest).toBeNull();
  });

  it('does not crash when gmail.authorize rejects after cancelAuthorization', async () => {
    controller.authorizationRequest = {resolve: jest.fn(), reject: jest.fn()};
    controller.cancelAuthorization();
    const err = Object.assign(new Error('late'), {code: 'GOOGLE_OAUTH_ERROR'});
    gmail.authorize.mockRejectedValue(err);
    await expect(controller.onAuthorize({email: 'a@example.com', legacyGsuite: false, scopes: []})).rejects.toBe(err);
  });

  it('does not crash when gmail.authorize resolves after cancelAuthorization', async () => {
    controller.authorizationRequest = {resolve: jest.fn(), reject: jest.fn()};
    controller.cancelAuthorization();
    gmail.authorize.mockResolvedValue('access-token');
    await expect(controller.onAuthorize({email: 'a@example.com', legacyGsuite: false, scopes: []})).resolves.toBeUndefined();
  });
});
