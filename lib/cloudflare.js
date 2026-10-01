'use strict';

const API = 'https://api.cloudflare.com/client/v4';
const BATCH_SIZE = 100;

class CloudflareError extends Error {}

class Cloudflare {
  constructor({ token, zoneId, fetchImpl = fetch }) {
    if (!token || !zoneId) throw new CloudflareError('CF_API_TOKEN and CF_ZONE_ID are required');
    this.token = token;
    this.zoneId = zoneId;
    this.fetch = fetchImpl;
  }

  async request(method, path, body) {
    const res = await this.fetch(`${API}/zones/${this.zoneId}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json;
    try {
      json = await res.json();
    } catch {
      throw new CloudflareError(`Cloudflare returned a non-JSON response (HTTP ${res.status})`);
    }
    if (!res.ok || !json.success) {
      const detail = (json.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ') || `HTTP ${res.status}`;
      throw new CloudflareError(`Cloudflare ${method} ${path} failed: ${detail}`);
    }
    return json;
  }

  async listRecords() {
    const all = [];
    for (let page = 1; ; page++) {
      const json = await this.request('GET', `/dns_records?per_page=100&page=${page}`);
      all.push(...json.result);
      const total = (json.result_info && json.result_info.total_pages) || 1;
      if (page >= total) return all;
    }
  }

  // Each batch call is atomic on Cloudflare's side; deletes run before posts so type changes work.
  async applyChanges({ deletes, patches, posts }) {
    const ops = [
      ...deletes.map((d) => ({ kind: 'deletes', body: { id: d.id } })),
      ...patches.map((p) => ({ kind: 'patches', body: p })),
      ...posts.map((p) => ({ kind: 'posts', body: p })),
    ];
    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const payload = { deletes: [], patches: [], posts: [] };
      for (const op of ops.slice(i, i + BATCH_SIZE)) payload[op.kind].push(op.body);
      await this.request('POST', '/dns_records/batch', payload);
    }
  }
}

module.exports = { Cloudflare, CloudflareError };
