/**
 * The app's composition root: the sealed library, wired once, over the scene's record.
 *
 * Bindings (MOD-02's ports, bound here and nowhere in the library): the record is append-only and
 * kept by the record service, shared by every device (stores.ts); the digest is SHA-256. Every
 * decision, refusal and reading the views show comes from these objects. The views hold no rule of
 * their own.
 */
import type { RecordHeight } from "../../src/kernel/index.js";
import type { RecordPort } from "../../src/ports/index.js";
import { CurrencyOrder, DeclarationLedger, IndependenceLedger, UnitRegistry } from "../../src/catalog/index.js";
import { CandidateLedger, CommitmentLedger, DrawContextLog, LineageReader } from "../../src/facts/index.js";
import { Reachability, ReachabilityGate } from "../../src/reachability/index.js";
import { InvalidationLedger, InvalidationScope, SignatureGate } from "../../src/lineage/index.js";
import { ConditionIdentities, RevisionLog, Samples } from "../../src/condition/index.js";
import { ObservationLedger } from "../../src/observation/index.js";
import { Dispersion, Location } from "../../src/statistics/index.js";
import { AE5_OPEN, Bar, PopulationPartition } from "../../src/calibration/index.js";
import { Diagnostic } from "../../src/diagnostic/index.js";
import { AuthorizationForms, Ratio, ScopeGate, ScopeLedger, ScopeReader } from "../../src/spend/index.js";
import { PROJECT } from "./project.js";
import { SHA256_HEX } from "./sha256.js";

/** The record as the app binds it: MOD-02's port, plus where it stands and how to catch up (stores.ts). */
export type AppRecord = RecordPort<unknown, RecordHeight> & { readonly top: () => RecordHeight; readonly empty: () => boolean; readonly refresh: () => Promise<number> };

export function engine(record: AppRecord) {
  const order = new CurrencyOrder({ currencies: [...PROJECT.currencies] });
  const registry = new UnitRegistry({ units: PROJECT.units });
  const lineage = new LineageReader({ record });
  const invalidations = new InvalidationLedger({ record, scopes: new InvalidationScope({ lineage }), renderer: { present: () => undefined } });
  const commitments = new CommitmentLedger({ record, invalidations });
  const reach = new ReachabilityGate({ reachability: new Reachability({ currencies: order, commitments }) });
  const scopeReader = new ScopeReader({ record });
  const scopeGate = new ScopeGate({ scopes: scopeReader, charges: lineage });
  const declarations = new DeclarationLedger({ record, levels: [...PROJECT.levels] });
  const draws = new DrawContextLog({ record, declarations, scopes: scopeGate, admission: reach });
  const independence = new IndependenceLedger({ record });
  const signatures = new SignatureGate({ digests: SHA256_HEX });
  const candidates = new CandidateLedger({ record, commitments, currencies: order, independence, admission: reach, signatures, ceiling: scopeGate });
  const identities = new ConditionIdentities({ digests: SHA256_HEX });
  const revisions = new RevisionLog({ record });
  const samples = new Samples({ candidates, draws, revisions, lineage });
  const observations = new ObservationLedger({ record, components: [...PROJECT.components] });
  const partition = new PopulationPartition({ lineage, samples, draws, declarations, invalidations, observations });
  const bar = new Bar({ populations: partition, separation: AE5_OPEN });
  const diagnostic = new Diagnostic({ samples, dispersion: new Dispersion({ samples, observations }), location: new Location({ samples, observations }), observations, bar, declarations });
  const ratio = new Ratio({ candidates });
  const forms = new AuthorizationForms({ ratio });
  const scopes = new ScopeLedger({ record, bar, declarations });
  return { record, order, registry, lineage, invalidations, commitments, reach, scopeReader, scopeGate, declarations, draws, independence, signatures, candidates, identities, revisions, samples, observations, partition, bar, diagnostic, ratio, forms, scopes };
}

export type Engine = ReturnType<typeof engine>;
