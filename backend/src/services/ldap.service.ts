import { Client, type ClientOptions } from 'ldapts';
import { adConfigRepository } from '../repositories/adConfig.repository.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import type { AdConfigRow } from '../database/types.js';

/**
 * Configuração de AD usada pelo cliente LDAP. Vem do banco (tabela ad_config),
 * gerenciada pela tela de configuração. A porta e o esquema (ldap:// | ldaps://)
 * fazem parte da URL.
 */
export interface AdConfig {
  url: string;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  searchFilter: string;
  tlsRejectUnauthorized: boolean;
  enabled: boolean;
}

export function rowToConfig(row: AdConfigRow): AdConfig {
  return {
    url: row.url,
    baseDn: row.base_dn,
    bindDn: row.bind_dn,
    bindPassword: row.bind_password,
    searchFilter: row.search_filter,
    tlsRejectUnauthorized: !!row.tls_reject_unauthorized,
    enabled: !!row.enabled,
  };
}

/** Config considerada "completa" o suficiente para tentar conectar. */
export function isConfigUsable(c: AdConfig): boolean {
  return Boolean(c.url && c.baseDn && c.bindDn);
}

/** AD habilitado E configurado (usado pelo fluxo de login). */
export function isAdEnabled(): boolean {
  const c = rowToConfig(adConfigRepository.get());
  return c.enabled && isConfigUsable(c);
}

function clientOptions(cfg: AdConfig): ClientOptions {
  const opts: ClientOptions = { url: cfg.url, timeout: 8000, connectTimeout: 8000 };
  if (cfg.url.startsWith('ldaps://')) {
    opts.tlsOptions = { rejectUnauthorized: cfg.tlsRejectUnauthorized };
  }
  return opts;
}

/** Escapa caracteres especiais de filtro LDAP (RFC 4515) para evitar injeção. */
function escapeFilter(input: string): string {
  const map: Record<string, string> = {
    '\\': '\\5c',
    '*': '\\2a',
    '(': '\\28',
    ')': '\\29',
    '\0': '\\00',
  };
  return input.replace(/[\\*()\0]/g, (c) => map[c] ?? c);
}

/** Localiza o DN do usuário usando a conta de serviço. */
async function findUserDn(cfg: AdConfig, username: string): Promise<string | null> {
  const client = new Client(clientOptions(cfg));
  try {
    await client.bind(cfg.bindDn, cfg.bindPassword);
    const filter = cfg.searchFilter.replace('{{username}}', escapeFilter(username));
    const { searchEntries } = await client.search(cfg.baseDn, {
      scope: 'sub',
      filter,
      attributes: ['dn'],
      sizeLimit: 1,
    });
    return searchEntries[0]?.dn ?? null;
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

/** Tenta autenticar (bind) como um DN com a senha informada. */
async function bindAs(cfg: AdConfig, dn: string, password: string): Promise<boolean> {
  if (!password) return false;
  const client = new Client(clientOptions(cfg));
  try {
    await client.bind(dn, password);
    return true;
  } catch {
    return false;
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

export interface AdTestResult {
  ok: boolean;
  step: 'connect' | 'bind-service' | 'search' | 'bind-user' | 'done';
  message: string;
  userDn?: string;
}

export const ldapService = {
  /**
   * Autentica um usuário (sAMAccountName + conta de serviço), usando a config
   * fornecida. Lança 503 se a config não for utilizável.
   */
  async authenticateWith(
    cfg: AdConfig,
    username: string,
    password: string
  ): Promise<boolean> {
    if (!isConfigUsable(cfg)) {
      throw new AppError('Autenticação AD não configurada.', 503);
    }
    if (!password) return false;

    let userDn: string | null;
    try {
      userDn = await findUserDn(cfg, username);
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'Falha na busca LDAP');
      throw new AppError('Erro ao consultar o AD.', 502);
    }
    if (!userDn) return false;
    return bindAs(cfg, userDn, password);
  },

  /** Fluxo de login real: usa a config persistida no banco. */
  async authenticate(username: string, password: string): Promise<boolean> {
    const cfg = rowToConfig(adConfigRepository.get());
    if (!cfg.enabled) {
      throw new AppError('Login via AD está desabilitado.', 503);
    }
    return this.authenticateWith(cfg, username, password);
  },

  /**
   * Testa a configuração passada (antes de salvar). Sempre conta de serviço;
   * se testUsername/testPassword forem informados, também valida o login.
   */
  async testConnection(
    cfg: AdConfig,
    testUsername?: string,
    testPassword?: string
  ): Promise<AdTestResult> {
    if (!isConfigUsable(cfg)) {
      return { ok: false, step: 'connect', message: 'URL, Base DN e Bind DN são obrigatórios.' };
    }

    // 1) bind da conta de serviço
    const svc = new Client(clientOptions(cfg));
    try {
      await svc.bind(cfg.bindDn, cfg.bindPassword);
    } catch (err) {
      await svc.unbind().catch(() => undefined);
      return {
        ok: false,
        step: 'bind-service',
        message: `Falha no bind da conta de serviço: ${(err as Error).message}`,
      };
    }

    // 2) busca de teste no base DN
    try {
      await svc.search(cfg.baseDn, { scope: 'base', attributes: ['dn'], sizeLimit: 1 });
    } catch (err) {
      return {
        ok: false,
        step: 'search',
        message: `Conectou, mas a busca no Base DN falhou: ${(err as Error).message}`,
      };
    } finally {
      await svc.unbind().catch(() => undefined);
    }

    // 3) (opcional) valida um login real
    if (testUsername && testPassword) {
      let dn: string | null;
      try {
        dn = await findUserDn(cfg, testUsername);
      } catch (err) {
        return { ok: false, step: 'search', message: `Erro ao buscar o usuário: ${(err as Error).message}` };
      }
      if (!dn) {
        return { ok: false, step: 'search', message: `Usuário "${testUsername}" não encontrado no AD.` };
      }
      const okUser = await bindAs(cfg, dn, testPassword);
      return okUser
        ? { ok: true, step: 'done', message: `Conexão e login de "${testUsername}" OK.`, userDn: dn }
        : { ok: false, step: 'bind-user', message: `Usuário encontrado, mas a senha de "${testUsername}" é inválida.`, userDn: dn };
    }

    return { ok: true, step: 'done', message: 'Conexão e conta de serviço OK.' };
  },
};
