import { db } from '../database/db.js';
import type { AdConfigRow } from '../database/types.js';

export interface AdConfigInput {
  url: string;
  base_dn: string;
  bind_dn: string;
  bind_password?: string; // se ausente/undefined, mantém a senha atual
  search_filter: string;
  tls_reject_unauthorized: boolean;
  enabled: boolean;
}

export const adConfigRepository = {
  get(): AdConfigRow {
    // A migration garante a linha id=1.
    return db.prepare('SELECT * FROM ad_config WHERE id = 1').get() as AdConfigRow;
  },

  update(input: AdConfigInput): AdConfigRow {
    const current = this.get();
    const password =
      input.bind_password === undefined || input.bind_password === ''
        ? current.bind_password
        : input.bind_password;

    db.prepare(
      `UPDATE ad_config SET
         url = @url,
         base_dn = @base_dn,
         bind_dn = @bind_dn,
         bind_password = @bind_password,
         search_filter = @search_filter,
         tls_reject_unauthorized = @tls,
         enabled = @enabled,
         updated_at = datetime('now')
       WHERE id = 1`
    ).run({
      url: input.url,
      base_dn: input.base_dn,
      bind_dn: input.bind_dn,
      bind_password: password,
      search_filter: input.search_filter,
      tls: input.tls_reject_unauthorized ? 1 : 0,
      enabled: input.enabled ? 1 : 0,
    });
    return this.get();
  },
};
