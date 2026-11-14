# AgentShield runtime containment design

Status: proposed runtime. Current policy drafts and simulations are not enforcement. Human verification, picture-match entertainment and managed CDN are separate products. This design makes bounded, testable claims; it does not claim universal sandbox-escape prevention or a world-first invention.

## Threat model and authority

Treat agent code, model output, retrieved pages, attachments and peer messages as untrusted. A prompt or model must never be the policy authority. Assets are workspace data, broker secrets, host/runtime control, network destinations, tenant artifacts and budget. Attack classes include task expansion, cross-tenant access, instruction injection, credential exfiltration, resource exhaustion, peer replay, dangerous host mounts and exploitation of the runtime/kernel/broker.

The control plane binds a human-approved intent to immutable task and policy versions. An execution capability contains workspace, principal/workload identity, task ID, allowed operation/resource/argument schema, policy hash, issuance/expiry, delegation depth, budget ceiling and unique nonce. The broker verifies identity and capability before each effect. A peer assertion that it is verified or safe is never sufficient.

## Independent enforcement layers

1. Admission: deny unknown principals, unsigned/replayed requests, wrong audiences, expired/revoked grants, policy mismatch, undeclared operations and over-budget tasks. No wildcard expansion from natural language.
2. Broker: narrowly typed methods for one approved read/write/model/connector effect. It owns secret resolution and destination validation; agents receive only necessary outputs or short-lived task-bound credentials. Rate, size, concurrency, deadline and delegation limits apply across retries and descendants.
3. Runtime: isolated disposable execution identity, non-root process, readonly image, scoped writable job storage, no host home/project mounts, no Docker/containerd socket, no host PID/network namespace and no privileged mode. CPU/memory/PID/disk/time limits are enforced outside the agent.
4. Network: no default egress/ingress for sandbox mode. Agent traffic cannot bypass the broker through DNS, proxy variables, alternate interfaces or direct sockets. Approved community peers need authenticated transport, exact audience/resource scope and bounded delegation; DNS/IP/redirect checks occur at the actual connection.
5. Isolation backend: evaluate a hardened OCI runtime, gVisor and VM/microVM-backed runners against required workloads and the host threat model. A standard container shares host-kernel risk and must not be advertised as equivalent to a VM boundary. Linux/VM requirements and Windows development behavior are different deployment profiles.
6. Evidence/revocation: broker decisions and runner events share a correlation ID; audit stores redacted request hashes, identity, policy, target and decision. Revocation stops future effects and cancels outstanding jobs/artifact publication. A runner cannot authorize itself by changing its own local policy file.

Candidate primary references (reviewed 2026-11-14): https://gvisor.dev/docs/ , https://github.com/firecracker-microvm/firecracker , https://katacontainers.io/ . These are existing isolation approaches, not proof that ForgeOS has deployed them or outperformed them.

## Conditions and expected response

- Unknown task/action/resource, missing consent or a task expansion: deny, explain exact missing capability, request a new explicit authorization through the control plane.
- Sandbox requests internet, host paths, control sockets or another workspace: deny at broker and runtime/network layers; record the attempt without leaking the requested secret.
- Peer identity/nonce/audience/expiry failure: reject before dispatch. Delegation cannot create a capability broader than its parent.
- Oversized payload, recursion, timeout, token/compute budget or unavailable policy backend: stop/deny rather than optimistically allowing an effect.
- Sensitive output through an allowed channel: apply output schemas/minimization and a reviewed data-loss policy; an allowlisted domain alone does not prove exfiltration safety.
- Suspected runner compromise: quarantine the disposable workload, revoke capabilities, preserve permitted evidence and prevent artifact promotion. Do not rely on the compromised workload to truthfully report its state.

## Controlled evaluation and release gates

Start with safe synthetic fixtures for prohibited path/network/broker operations, not unknown exploit execution against a user host. Verify cross-tenant denial, filesystem/symlink boundaries, default egress denial, metadata endpoints, peer replay, capability expiry/revocation, budget conservation, descendant cancellation and secret redaction. Test failure of the policy service/broker/runner and prove fail-closed behavior. No production secrets in fixtures.

Then assess runner patching/supply chain, broker parser surface, isolation backend compatibility/performance, evidence retention and independent security testing. Publish environment, versions, tested adversary assumptions, allowed effects, residual risks and regression results. Novelty and security effectiveness need separate research evidence; a successful demo or absence of an observed escape is not a proof.
