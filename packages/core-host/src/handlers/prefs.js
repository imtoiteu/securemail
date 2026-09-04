import * as prefs from '../../../../mailvelope/src/modules/prefs';

export function build() {
  return {
    'prefs.get': async () => prefs.prefs,
    'prefs.set': async ({prefs: update}) => {
      await prefs.update(update);
      return {ok: true};
    }
  };
}
