import {
  adConfigRepository,
  type AdConfigInput,
} from '../repositories/adConfig.repository.js';
import { ldapService, rowToConfig, type AdConfig } from './ldap.service.js';

/** Versão segura (sem a senha) para enviar ao cliente. */
function sanitize(row = adConfigRepository.get()) {
  return {
    url: row.url,
    base_dn: row.base_dn,
    bind_dn: row.bind_dn,
    search_filter: row.search_filter,
    tls_reject_unauthorized: !!row.tls_reject_unauthorized,
    enabled: !!row.enabled,
    hasPassword: !!row.bind_password,
    updated_at: row.updated_at,
  };
}

/** Monta a config efetiva para teste: usa a senha do form ou, se vazia, a salva. */
function buildConfigForTest(input: AdConfigInput): AdConfig {
  const current = adConfigRepository.get();
  return {
    url: input.url,
    baseDn: input.base_dn,
    bindDn: input.bind_dn,
    bindPassword:
      input.bind_password === undefined || input.bind_password === ''
        ? current.bind_password
        : input.bind_password,
    searchFilter: input.search_filter,
    tlsRejectUnauthorized: input.tls_reject_unauthorized,
    enabled: input.enabled,
  };
}

export const adConfigService = {
  get() {
    return sanitize();
  },

  update(input: AdConfigInput) {
    return sanitize(adConfigRepository.update(input));
  },

  /** Testa a config informada (sem persistir), opcionalmente validando um login. */
  async test(input: AdConfigInput, testUsername?: string, testPassword?: string) {
    const cfg = buildConfigForTest(input);
    return ldapService.testConnection(cfg, testUsername, testPassword);
  },
};

export { rowToConfig };
