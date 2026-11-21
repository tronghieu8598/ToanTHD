import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { libraryPath } from "../lib/library-http.mjs";
import { serveHostedLibrary } from "../lib/library-hosted.mjs";
import release from "../data/digital-library/generated/library-release.json";
import { createLibraryRelease, libraryReleasePath, libraryReleaseStatusPath } from "./library-release.mjs";

const {handleLibraryRelease, serveLibraryRelease} = createLibraryRelease(release);

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const {pathname} = new URL(request.url);
    if (pathname === libraryReleasePath || pathname.startsWith(libraryReleasePath + '/') || pathname === libraryReleaseStatusPath) {
      return handleLibraryRelease(request, env);
    }
    if (env.BUCKET && pathname.startsWith(libraryPath)) {
      return (await serveLibraryRelease(request, env)) ?? serveHostedLibrary(request, env.BUCKET);
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
