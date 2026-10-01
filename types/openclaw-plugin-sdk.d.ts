// Local declaration of the OpenClaw plugin SDK types that plugin.ts imports.
//
// Upstream ships these from the `openclaw` package and carries it as a
// devDependency purely so tsc can resolve this import. That package's preinstall
// hook hard-fails on Node < 24.16.0, and this fork pins Node 22 to match the
// node:22-trixie-slim image it publishes, so the devDependency would make
// `npm ci` impossible. The optional peerDependency in package.json remains the
// declaration of which host version is supported.
//
// Only the members plugin.ts actually touches are declared; index signatures keep
// everything else permissive so this shim cannot invent a contract. Delete this
// file and restore the devDependency if the fork ever moves to Node >= 24.16.
// Pinned by tests/unit/pluginTypecheck.test.js.

declare module "openclaw/plugin-sdk/core" {
  export interface OpenClawPluginLogger {
    info?(...args: unknown[]): void;
    error?(...args: unknown[]): void;
    [key: string]: unknown;
  }

  export interface OpenClawPluginToolContext {
    agentId?: string;
    sessionKey?: string;
    [key: string]: unknown;
  }

  export interface OpenClawPluginCommand {
    name: string;
    description?: string;
    handler(input: { args?: string }): unknown;
  }

  export interface OpenClawPluginGatewayRequest {
    params?: Record<string, unknown>;
    respond(ok: boolean, payload?: unknown): void;
  }

  export interface OpenClawPluginApi {
    config?: unknown;
    pluginConfig?: unknown;
    logger?: OpenClawPluginLogger;
    registerTool(
      factory: (ctx: OpenClawPluginToolContext) => unknown,
      options?: { name?: string }
    ): void;
    registerCommand(command: OpenClawPluginCommand): void;
    registerGatewayMethod(
      name: string,
      handler: (request: OpenClawPluginGatewayRequest) => unknown,
      options?: { scope?: string }
    ): void;
    // The CLI builder receives the host's commander program; its shape is not
    // modelled here because this plugin only chains commander's own API on it.
    registerCli?(
      build: (input: { program: any }) => unknown,
      options?: { commands?: string[] }
    ): void;
    [key: string]: unknown;
  }
}
