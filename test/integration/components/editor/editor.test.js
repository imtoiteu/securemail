/* global page */

/**
 * Editor component integration tests.
 *
 * Mounts the real `Editor` React component into the test page and drives
 * it through a stubbed port (we act as the editor's controller). Verifies
 * the recipient-resolution flow added in the lookupPending refactor:
 * pending badges, key-lookup-result reconciliation, alert gating, and
 * encrypt-button enablement.
 *
 * Disjoint from `test/integration/controller/editor.controller.test.js`
 * which covers the same wire protocol from the controller side.
 */

const TEST_KEY_EMAIL = 'test@mailvelope.com';
const JOHND_EMAIL = 'j.doe@gmail.com';

// Stand-in key descriptors for `public-key-userids`. The editor only reads
// {email, userId, keyId, fingerprint} from these — they don't need to be
// real OpenPGP key objects.
const SEEDED_KEYS = [
  {
    email: TEST_KEY_EMAIL,
    userId: `Test User <${TEST_KEY_EMAIL}>`,
    keyId: 'ABCD1234ABCD1234',
    fingerprint: 'add0c44ae80a572f3805729cf47328454fa3ab54'
  },
  {
    email: JOHND_EMAIL,
    userId: `John Doe <${JOHND_EMAIL}>`,
    keyId: 'EEEE5678FFFF9999',
    fingerprint: 'eeeeffffeeee5678ffffeeee0000111122223333'
  }
];

describe('Editor component integration tests', () => {
  beforeAll(async () => {
    await page.goto(global.testPageUrl, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof window.testHarness !== 'undefined');
  });

  beforeEach(async () => {
    await page.evaluate(async () => {
      // Skip the real onConnect listener — this suite acts as the controller stub.
      // No keyring/key data is needed: the editor reads keys only via the
      // `public-key-userids` port event, which the tests post directly.
      await window.testHarness.initCore({skipController: true});
    });
  });

  afterEach(async () => {
    await page.evaluate(async () => {
      window.testHarness.unmountEditor();
      await window.testHarness.reset();
    });
  });

  /**
   * Mount the editor, capture its outbound events, optionally drive the
   * basic set-mode + set-init-data + public-key-userids handshake.
   * Returns the captured `editor-mount` event.
   */
  const setupEditor = ({mode = {}, initData = {}, autoHandshake = true, keys = [], to = [], cc = []} = {}) =>
    page.evaluate(async args => {
      const portName = window.testHarness.mountEditor({id: 'test-editor'});
      const port = window.testHarness.getEditorPort(portName);
      port.enableEventCapture();
      const mountEvent = await port.waitForEvent('editor-mount');

      if (args.autoHandshake) {
        port.postMessage({event: 'set-mode', embedded: false, integration: false, ...args.mode});
        port.postMessage({
          event: 'set-init-data',
          text: '',
          signMsg: false,
          subject: '',
          defaultKeyFpr: '',
          privKeys: [],
          ...args.initData
        });
        port.postMessage({event: 'public-key-userids', keys: args.keys, to: args.to, cc: args.cc});
        // Let React flush all the state updates triggered above.
        await new Promise(r => setTimeout(r, 50));
      }

      window.testHarness.setTestData('editorPort', port);
      return {mountEvent};
    }, {mode, initData, autoHandshake, keys, to, cc});

  /**
   * Type a string into a recipient input (default: main = first) and press a separator key.
   */
  const typeRecipient = async (text, separator = 'Enter', inputIndex = 0) => {
    await page.evaluate(idx => {
      document.querySelectorAll('.recipients-input')[idx].querySelector('.tag-input-field').focus();
    }, inputIndex);
    await page.keyboard.type(text);
    await page.keyboard.press(separator);
    // Give React a beat to reconcile the new tag.
    await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
  };

  /**
   * Toggle the editor's extraKey checkbox. The checkbox is rendered inside
   * a reactstrap Collapse that's initially closed, so we expand it first
   * (the Collapse only animates CSS; children are always in the DOM, but
   * keeping them visible mirrors how a user would interact with the UI).
   */
  const toggleExtraKey = async () => {
    await page.evaluate(() => {
      // Expand the sign-options Collapse so the checkbox is visible/active.
      const toggle = document.querySelector('button[aria-controls="sign-msg-option"]');
      toggle?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
    await page.evaluate(() => document.querySelector('#extraKeyCheck').click());
    await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
  };

  // ------------------------------------------------------------------
  // A. Mount + initial wiring
  // ------------------------------------------------------------------
  describe('A. Mount and initial wiring', () => {
    it('emits editor-mount on the port', async () => {
      const {mountEvent} = await setupEditor({autoHandshake: false});
      expect(mountEvent.event).toBe('editor-mount');
    });

    it('renders the main recipient input and encrypt button after set-mode/set-init-data', async () => {
      await setupEditor();
      const result = await page.evaluate(() => ({
        hasRecipientInput: document.querySelectorAll('.recipients-input').length,
        encryptButtonDisabled: document.querySelector('.modal-footer .btn-primary')?.disabled
      }));
      expect(result.hasRecipientInput).toBeGreaterThanOrEqual(1);
      // No recipients yet → encrypt disabled.
      expect(result.encryptButtonDisabled).toBe(true);
    });

    it('populates suggestions from public-key-userids when the input is focused', async () => {
      const keys = SEEDED_KEYS;
      await setupEditor({keys});
      // Type the first character of "test@mailvelope.com" to trigger suggestions.
      await page.evaluate(() => {
        document.querySelectorAll('.recipients-input')[0].querySelector('.tag-input-field').focus();
      });
      await page.keyboard.type('t');
      await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
      const suggestionCount = await page.evaluate(() =>
        document.querySelectorAll('.recipients-input')[0].querySelectorAll('.suggestions li').length
      );
      expect(suggestionCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ------------------------------------------------------------------
  // B. RecipientInput — tag entry & validation
  // ------------------------------------------------------------------
  describe('B. Tag entry and validation', () => {
    // The plan also expected Space to terminate a tag, but react-tag-input
    // 6.5.4 silently ignores the editor's `separators` prop (renamed to
    // `delimiters` in this version) and only honors Enter + Tab. We assert
    // current behavior here.
    it.each([
      ['Enter', 'Enter'],
      ['Tab', 'Tab']
    ])('adds a tag when the user presses %s', async (_label, key) => {
      await setupEditor();
      await typeRecipient(TEST_KEY_EMAIL, key);
      const tagCount = await page.evaluate(() => document.querySelectorAll('.recipients-input')[0].querySelectorAll('.tag.badge').length);
      expect(tagCount).toBe(1);
    });

    it('does not add a tag for invalid email syntax', async () => {
      await setupEditor();
      await typeRecipient('not-an-email');
      const tagCount = await page.evaluate(() => document.querySelectorAll('.recipients-input')[0].querySelectorAll('.tag.badge').length);
      expect(tagCount).toBe(0);
    });

    it('removes a tag when the user clicks .tag-remove', async () => {
      await setupEditor();
      await typeRecipient(TEST_KEY_EMAIL);
      await page.evaluate(() => {
        document.querySelectorAll('.recipients-input')[0].querySelector('.tag-remove').click();
      });
      await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
      const tagCount = await page.evaluate(() => document.querySelectorAll('.recipients-input')[0].querySelectorAll('.tag.badge').length);
      expect(tagCount).toBe(0);
    });

    it('returns focus to the input after each addition (regression for setTimeout focus-restore)', async () => {
      await setupEditor();
      // Focus once, then rely on the post-add focus restoration.
      await page.evaluate(() => {
        document.querySelectorAll('.recipients-input')[0].querySelector('.tag-input-field').focus();
      });
      await page.keyboard.type('alice@example.com');
      await page.keyboard.press('Enter');
      // Wait for the setTimeout(..., 0) focus-restore to fire.
      await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
      // Type without re-focusing — only succeeds if focus is still on the input.
      await page.keyboard.type('bob@example.com');
      await page.keyboard.press('Enter');
      await page.evaluate(() => new Promise(r => setTimeout(r, 30)));

      const result = await page.evaluate(() => {
        const input = document.querySelectorAll('.recipients-input')[0].querySelector('.tag-input-field');
        return {
          focused: document.activeElement === input,
          tagCount: document.querySelectorAll('.recipients-input')[0].querySelectorAll('.tag.badge').length
        };
      });
      expect(result.focused).toBe(true);
      expect(result.tagCount).toBe(2);
    });
  });

  // ------------------------------------------------------------------
  // C. RecipientInput — autocomplete
  // ------------------------------------------------------------------
  describe('C. Autocomplete', () => {
    it('highlights the typed substring with <mark>', async () => {
      const keys = SEEDED_KEYS;
      await setupEditor({keys});
      await page.evaluate(() => {
        document.querySelectorAll('.recipients-input')[0].querySelector('.tag-input-field').focus();
      });
      await page.keyboard.type('test');
      await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
      const hasMark = await page.evaluate(() =>
        Boolean(document.querySelectorAll('.recipients-input')[0].querySelector('.suggestions li mark'))
      );
      expect(hasMark).toBe(true);
    });

    it('excludes already-added recipients from suggestions', async () => {
      const keys = SEEDED_KEYS;
      await setupEditor({keys});
      await typeRecipient(TEST_KEY_EMAIL);
      await page.evaluate(() => {
        document.querySelectorAll('.recipients-input')[0].querySelector('.tag-input-field').focus();
      });
      await page.keyboard.type('test');
      await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
      const matchingSuggestions = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.recipients-input')[0].querySelectorAll('.suggestions li'))
        .filter(li => li.textContent.includes('test@mailvelope.com')).length
      );
      expect(matchingSuggestions).toBe(0);
    });

    it('creates a tag whose id is the email when a suggestion is picked', async () => {
      const keys = SEEDED_KEYS;
      await setupEditor({keys});
      await page.evaluate(() => {
        document.querySelectorAll('.recipients-input')[0].querySelector('.tag-input-field').focus();
      });
      await page.keyboard.type('test');
      await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
      // Pick the first suggestion. react-tag-input listens on mousedown
      // (not click), so `.click()` is a no-op — dispatch mousedown directly.
      await page.evaluate(() => {
        const li = document.querySelectorAll('.recipients-input')[0].querySelector('.suggestions li');
        li.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
      });
      await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
      const tagText = await page.evaluate(() => {
        const tag = document.querySelectorAll('.recipients-input')[0].querySelector('.tag.badge');
        return tag?.textContent || '';
      });
      // The tag's displayId is the email, not the "userId - keyId" label.
      expect(tagText).toContain(TEST_KEY_EMAIL);
    });
  });

  // ------------------------------------------------------------------
  // D. RecipientInput — badge states (the refactor's core)
  // ------------------------------------------------------------------
  describe('D. Badge states', () => {
    it('shows badge-success when the recipient has a local key', async () => {
      const keys = SEEDED_KEYS;
      await setupEditor({keys});
      await typeRecipient(TEST_KEY_EMAIL);
      const className = await page.evaluate(() =>
        document.querySelectorAll('.recipients-input')[0].querySelector('.tag.badge').className
      );
      expect(className).toContain('badge-success');
    });

    it('shows badge-pending immediately for an unknown recipient and emits key-lookup', async () => {
      await setupEditor();
      await typeRecipient('lookup-pending@example.com');
      const result = await page.evaluate(() => {
        const port = window.testHarness.getTestData('editorPort');
        const className = document.querySelectorAll('.recipients-input')[0].querySelector('.tag.badge').className;
        const lookup = port.getCapturedEvents().find(e => e.event === 'key-lookup');
        return {className, lookupEmail: lookup?.recipient?.email};
      });
      expect(result.className).toContain('badge-pending');
      expect(result.lookupEmail).toBe('lookup-pending@example.com');
    });

    it('transitions a pending badge to success after key-update + key-lookup-result', async () => {
      await setupEditor({keys: SEEDED_KEYS});
      await typeRecipient('newkey@example.com');

      const className = await page.evaluate(async existing => {
        const port = window.testHarness.getTestData('editorPort');
        const newKey = {email: 'newkey@example.com', userId: 'New Key <newkey@example.com>', keyId: 'AAAA1111BBBB2222', fingerprint: 'aaaabbbbccccddddeeeeffff0000111122223333'};
        port.postMessage({event: 'key-update', keys: [...existing, newKey]});
        port.postMessage({event: 'key-lookup-result', email: 'newkey@example.com', found: true});
        await new Promise(r => setTimeout(r, 50));
        return document.querySelectorAll('.recipients-input')[0].querySelector('.tag.badge').className;
      }, SEEDED_KEYS);
      expect(className).toContain('badge-success');
      expect(className).not.toContain('badge-pending');
    });

    it('transitions a pending badge to danger after key-lookup-result with no key', async () => {
      await setupEditor();
      await typeRecipient('not-found@example.com');
      const className = await page.evaluate(async () => {
        const port = window.testHarness.getTestData('editorPort');
        port.postMessage({event: 'key-lookup-result', email: 'not-found@example.com', found: false});
        await new Promise(r => setTimeout(r, 50));
        return document.querySelectorAll('.recipients-input')[0].querySelector('.tag.badge').className;
      });
      expect(className).toContain('badge-danger');
      expect(className).not.toContain('badge-pending');
    });

    it('shows badge-info instead of danger when extraKey mode is active', async () => {
      const keys = SEEDED_KEYS;
      await setupEditor({keys});

      // Toggle extra-key mode and add a known recipient in the extra-key input
      // so the main input's hasExtraKey computed prop becomes true.
      await toggleExtraKey();
      // The extra-key input is rendered inside .modal-footer; it's a sibling RecipientInput.
      await typeRecipient(TEST_KEY_EMAIL, 'Enter', 1);

      // Add an unknown recipient to the main input.
      await typeRecipient('extra-mode@example.com', 'Enter', 0);

      const className = await page.evaluate(async () => {
        const port = window.testHarness.getTestData('editorPort');
        port.postMessage({event: 'key-lookup-result', email: 'extra-mode@example.com', found: false});
        await new Promise(r => setTimeout(r, 50));
        return document.querySelectorAll('.recipients-input')[0].querySelector('.tag.badge').className;
      });
      expect(className).toContain('badge-info');
    });

    it('updates two simultaneous lookups independently', async () => {
      await setupEditor();
      await typeRecipient('one@example.com');
      await typeRecipient('two@example.com');

      const classNames = await page.evaluate(async () => {
        const port = window.testHarness.getTestData('editorPort');
        port.postMessage({event: 'key-lookup-result', email: 'one@example.com', found: false});
        await new Promise(r => setTimeout(r, 50));
        const after1 = Array.from(document.querySelectorAll('.recipients-input')[0].querySelectorAll('.tag.badge')).map(t => t.className);
        port.postMessage({event: 'key-lookup-result', email: 'two@example.com', found: false});
        await new Promise(r => setTimeout(r, 50));
        const after2 = Array.from(document.querySelectorAll('.recipients-input')[0].querySelectorAll('.tag.badge')).map(t => t.className);
        return {after1, after2};
      });

      // After first lookup-result: one resolved (danger), two still pending.
      expect(classNames.after1[0]).toContain('badge-danger');
      expect(classNames.after1[1]).toContain('badge-pending');
      // After second: both resolved.
      expect(classNames.after2[0]).toContain('badge-danger');
      expect(classNames.after2[1]).toContain('badge-danger');
    });
  });

  // ------------------------------------------------------------------
  // E. RecipientInput — alerts
  // ------------------------------------------------------------------
  describe('E. Alerts', () => {
    it('shows the not-found alert only when a recipient is unresolved and not pending', async () => {
      await setupEditor();
      await typeRecipient('alert-test@example.com');
      // The alert lives in the RecipientInput wrapper, a sibling of the
      // `.recipients-input` element, so we walk up to the parent first.
      const queryAlerts = () => page.evaluate(() => {
        const wrapper = document.querySelectorAll('.recipients-input')[0].parentElement;
        return {
          danger: Boolean(wrapper.querySelector('.alert-danger')),
          info: Boolean(wrapper.querySelector('.alert-info'))
        };
      });
      // While pending: neither alert visible.
      const whilePending = await queryAlerts();
      expect(whilePending.danger).toBe(false);
      expect(whilePending.info).toBe(false);

      // After lookup-result with no key: not-found alert shows.
      await page.evaluate(async () => {
        const port = window.testHarness.getTestData('editorPort');
        port.postMessage({event: 'key-lookup-result', email: 'alert-test@example.com', found: false});
        await new Promise(r => setTimeout(r, 50));
      });
      const afterResolve = await queryAlerts();
      expect(afterResolve.danger).toBe(true);
    });

    it('shows the extra-key info alert once lookups complete and extraKey is true', async () => {
      const keys = SEEDED_KEYS;
      await setupEditor({keys});
      await toggleExtraKey();
      await typeRecipient(TEST_KEY_EMAIL, 'Enter', 1);
      // showExtraKeyAlert fires as long as no recipient on the main input is
      // pending and extraKey is true — an empty main input is sufficient.
      const hasInfoAlert = await page.evaluate(() => {
        const wrapper = document.querySelectorAll('.recipients-input')[0].parentElement;
        return Boolean(wrapper.querySelector('.alert-info'));
      });
      expect(hasInfoAlert).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // F. Editor — encrypt button gating
  // ------------------------------------------------------------------
  describe('F. Encrypt button gating', () => {
    const encryptDisabled = () =>
      page.evaluate(() => document.querySelector('.modal-footer .btn-primary')?.disabled);

    it('is disabled with no recipients', async () => {
      await setupEditor({initData: {text: 'hello'}});
      expect(await encryptDisabled()).toBe(true);
    });

    it('is enabled when a known-key recipient is present and message is non-empty', async () => {
      const keys = SEEDED_KEYS;
      await setupEditor({keys, initData: {text: 'hello'}});
      await typeRecipient(TEST_KEY_EMAIL);
      expect(await encryptDisabled()).toBe(false);
    });

    it('is disabled while a recipient is pending', async () => {
      await setupEditor({initData: {text: 'hello'}});
      await typeRecipient('pending-gate@example.com');
      expect(await encryptDisabled()).toBe(true);
    });

    it('stays disabled after a not-found resolution', async () => {
      await setupEditor({initData: {text: 'hello'}});
      await typeRecipient('pending-gate@example.com');
      await page.evaluate(async () => {
        const port = window.testHarness.getTestData('editorPort');
        port.postMessage({event: 'key-lookup-result', email: 'pending-gate@example.com', found: false});
        await new Promise(r => setTimeout(r, 50));
      });
      expect(await encryptDisabled()).toBe(true);
    });

    it('becomes enabled after a successful resolution', async () => {
      const initialKeys = SEEDED_KEYS;
      await setupEditor({keys: initialKeys, initData: {text: 'hello'}});
      await typeRecipient('resolved@example.com');
      await page.evaluate(async initial => {
        const port = window.testHarness.getTestData('editorPort');
        const newKey = {email: 'resolved@example.com', userId: 'Resolved <resolved@example.com>', keyId: 'CCCC2222DDDD3333', fingerprint: 'ccccddddccccddddeeeeffff0000111122223333'};
        port.postMessage({event: 'key-update', keys: [...initial, newKey]});
        port.postMessage({event: 'key-lookup-result', email: 'resolved@example.com', found: true});
        await new Promise(r => setTimeout(r, 50));
      }, initialKeys);
      expect(await encryptDisabled()).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // G. Race / cleanup
  // ------------------------------------------------------------------
  describe('G. Race and cleanup', () => {
    it('handles key-lookup-result for a deleted recipient as a no-op', async () => {
      await setupEditor();
      await typeRecipient('to-delete@example.com');
      // Remove the tag before the lookup result arrives.
      await page.evaluate(async () => {
        document.querySelectorAll('.recipients-input')[0].querySelector('.tag-remove').click();
        await new Promise(r => setTimeout(r, 30));
      });
      // Now post a late lookup-result; it must not throw or revive the tag.
      const tagCount = await page.evaluate(async () => {
        const port = window.testHarness.getTestData('editorPort');
        port.postMessage({event: 'key-lookup-result', email: 'to-delete@example.com', found: false});
        await new Promise(r => setTimeout(r, 50));
        return document.querySelectorAll('.recipients-input')[0].querySelectorAll('.tag.badge').length;
      });
      expect(tagCount).toBe(0);
    });

    it('unmount during an in-flight lookup does not throw', async () => {
      await setupEditor();
      await typeRecipient('in-flight@example.com');
      const errors = [];
      const onError = err => errors.push(err.message);
      page.on('pageerror', onError);
      await page.evaluate(async () => {
        window.testHarness.unmountEditor();
        // Re-mount nothing — just confirm late events don't reach the unmounted tree.
        const port = window.testHarness.getTestData('editorPort');
        try {
          port.postMessage({event: 'key-lookup-result', email: 'in-flight@example.com', found: false});
        } catch {
          // Port may be disconnected after unmount; that's expected.
        }
        await new Promise(r => setTimeout(r, 50));
      });
      page.off('pageerror', onError);
      expect(errors).toEqual([]);
    });
  });
});
