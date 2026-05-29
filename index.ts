import { MCPServer, object, text, error, widget, completable } from "mcp-use/server";
import { MCPClient } from "mcp-use";
import { z } from "zod";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

// ============================================
// Contacts Store (JSON key-value)
// ============================================
const CONTACTS_PATH = resolve(process.cwd(), "contacts.json");

function loadContacts(): Record<string, string> {
  try {
    if (existsSync(CONTACTS_PATH)) {
      return JSON.parse(readFileSync(CONTACTS_PATH, "utf-8"));
    }
  } catch {}
  return {};
}

function saveContacts(contacts: Record<string, string>) {
  writeFileSync(CONTACTS_PATH, JSON.stringify(contacts, null, 2), "utf-8");
}

function resolvePhoneNumber(nameOrNumber: string): { name: string | null; phone: string } | null {
  // If it looks like a phone number already, return as-is
  if (nameOrNumber.startsWith("+") || /^\d{10,}$/.test(nameOrNumber)) {
    return { name: null, phone: nameOrNumber };
  }
  // Otherwise look up in contacts (case-insensitive)
  const contacts = loadContacts();
  const key = Object.keys(contacts).find(
    (k) => k.toLowerCase() === nameOrNumber.toLowerCase()
  );
  if (key) {
    return { name: key, phone: contacts[key] };
  }
  return null;
}

// ============================================
// User MCP Server Registry (JSON store)
// ============================================
const REGISTRY_PATH = resolve(process.cwd(), "user-servers.json");

interface RegisteredServer {
  url: string;
  addedAt: string;
  tools: string[];
}

interface ServerRegistry {
  servers: Record<string, RegisteredServer>;
}

function loadRegistry(): ServerRegistry {
  try {
    if (existsSync(REGISTRY_PATH)) {
      return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
    }
  } catch {}
  return { servers: {} };
}

function saveRegistry(registry: ServerRegistry) {
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf-8");
}

// Live sessions for dynamically registered servers (keyed by server name)
const liveSessions: Map<string, { session: any; toolNames: string[] }> = new Map();

// Set of server names that have been removed (tools stay registered but calls are blocked)
const removedServers: Set<string> = new Set();

/**
 * Connect to a single MCP server by URL, discover its tools,
 * register them on the orchestrator, persist to user-servers.json,
 * and store the live session for proxying.
 */
async function connectAndRegisterServer(name: string, url: string): Promise<string[]> {
  const config = { mcpServers: { [name]: { url } } };
  const client = MCPClient.fromDict(config);

  console.log(`[registry] Connecting to "${name}" at ${url}...`);
  const session = await client.createSession(name);
  const tools = await session.listTools();

  console.log(`[registry] "${name}" has ${tools.length} tool(s): ${tools.map((t: any) => t.name).join(", ")}`);

  const registeredToolNames: string[] = [];

  for (const tool of tools) {
    const namespacedName = `${name}__${tool.name}`;
    registeredToolNames.push(namespacedName);

    server.tool(
      {
        name: namespacedName,
        description: `[${name}] ${tool.description || tool.name}`,
        schema: jsonSchemaToZod(tool.inputSchema),
      },
      async (args: any) => {
        if (removedServers.has(name)) {
          return error(`Server "${name}" has been removed. Re-register it to use its tools.`);
        }
        try {
          const result = await session.callTool(tool.name, args);
          return formatBackendResult(result);
        } catch (err: any) {
          return error(`Failed to call ${name}/${tool.name}: ${err.message}`);
        }
      }
    );
  }

  liveSessions.set(name, { session, toolNames: registeredToolNames });

  // Persist to registry
  const registry = loadRegistry();
  registry.servers[name] = {
    url,
    addedAt: new Date().toISOString(),
    tools: registeredToolNames,
  };
  saveRegistry(registry);

  connectedBackends.push({ name, toolCount: tools.length });
  console.log(`[registry] ✓ "${name}" registered with ${tools.length} tools`);

  return registeredToolNames;
}

// ============================================
// Server Setup
// ============================================
const server = new MCPServer({
  name: "lark-gateway",
  title: "Lark MCP Gateway",
  version: "1.0.0",
  description:
    "Lark — a dynamic MCP gateway. Register your MCP servers and Lark aggregates all their tools into one endpoint.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// ============================================
// Orchestrator: Connect to backend MCP servers
// ============================================

// Track connected backends for the status resource
const connectedBackends: { name: string; toolCount: number }[] = [];

/**
 * Convert a JSON Schema property to a Zod type.
 * Handles string, number, integer, boolean, array, enum.
 * Falls back to z.any() for complex/unknown types.
 */
function jsonSchemaPropertyToZod(prop: any): z.ZodType {
  if (!prop) return z.any();

  // Handle enums
  if (prop.enum && Array.isArray(prop.enum) && prop.enum.length > 0) {
    return z.enum(prop.enum as [string, ...string[]]);
  }

  switch (prop.type) {
    case "string":
      return z.string();
    case "number":
    case "integer":
      return z.number();
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(z.any());
    case "object":
      // Nested object — don't recurse deeply, just accept any object
      return z.record(z.string(), z.any());
    default:
      return z.any();
  }
}

/**
 * Convert a full JSON Schema (tool inputSchema) to a Zod object schema.
 * Preserves property descriptions and required/optional status.
 */
function jsonSchemaToZod(inputSchema: any): z.ZodObject<any> {
  if (!inputSchema || !inputSchema.properties) {
    return z.object({});
  }

  const shape: Record<string, z.ZodType> = {};
  const required: string[] = inputSchema.required || [];

  for (const [key, prop] of Object.entries(inputSchema.properties as Record<string, any>)) {
    let field = jsonSchemaPropertyToZod(prop);

    // Add description if present
    if (prop.description) {
      field = field.describe(prop.description);
    }

    // Mark optional if not in required array
    if (!required.includes(key)) {
      field = field.optional();
    }

    shape[key] = field;
  }

  return z.object(shape);
}

/**
 * Convert a backend CallToolResult into an mcp-use server response.
 */
function formatBackendResult(result: any) {
  if (result.isError) {
    const msg = result.content?.[0]?.text || "Tool execution failed";
    return error(msg);
  }

  const textParts = result.content
    ?.filter((c: any) => c.type === "text")
    .map((c: any) => c.text);

  if (textParts && textParts.length > 0) {
    const combined = textParts.join("\n");
    // Try parsing as JSON for structured responses
    try {
      return object(JSON.parse(combined));
    } catch {
      return text(combined);
    }
  }

  return text("Tool executed successfully (no output)");
}

/**
 * Replace ${ENV_VAR} patterns in config with actual env values.
 * Keeps secrets out of mcp-servers.json.
 */
function interpolateEnvVars(obj: any): any {
  if (typeof obj === "string") {
    return obj.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] || "");
  }
  if (Array.isArray(obj)) return obj.map(interpolateEnvVars);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, interpolateEnvVars(v)])
    );
  }
  return obj;
}

/**
 * Load mcp-servers.json (hardcoded backends) AND user-servers.json
 * (user-registered servers), connect to all of them, discover tools,
 * and register them on our server with namespaced names.
 */
async function connectBackendServers() {
  // --- Phase 1: Hardcoded backends from mcp-servers.json ---
  const configPath = resolve(process.cwd(), "mcp-servers.json");

  if (existsSync(configPath)) {
    const configRaw = readFileSync(configPath, "utf-8");
    const config = interpolateEnvVars(JSON.parse(configRaw));
    const serverNames = Object.keys(config.mcpServers || {});

    if (serverNames.length > 0) {
      console.log(`[orchestrator] Connecting to ${serverNames.length} hardcoded backend(s): ${serverNames.join(", ")}`);
      const client = MCPClient.fromDict(config);

      for (const serverName of serverNames) {
        try {
          console.log(`[orchestrator] Connecting to "${serverName}"...`);
          const session = await client.createSession(serverName);
          const tools = await session.listTools();

          console.log(`[orchestrator] "${serverName}" has ${tools.length} tool(s): ${tools.map((t: any) => t.name).join(", ")}`);

          for (const tool of tools) {
            const namespacedName = `${serverName}__${tool.name}`;

            server.tool(
              {
                name: namespacedName,
                description: `[${serverName}] ${tool.description || tool.name}`,
                schema: jsonSchemaToZod(tool.inputSchema),
              },
              async (args: any) => {
                try {
                  const result = await session.callTool(tool.name, args);
                  return formatBackendResult(result);
                } catch (err: any) {
                  return error(`Failed to call ${serverName}/${tool.name}: ${err.message}`);
                }
              }
            );
          }

          connectedBackends.push({ name: serverName, toolCount: tools.length });
          console.log(`[orchestrator] ✓ "${serverName}" registered (${tools.length} tools)`);
        } catch (err: any) {
          console.error(`[orchestrator] ✗ Failed to connect to "${serverName}": ${err.message}`);
        }
      }
    } else {
      console.log("[orchestrator] mcp-servers.json is empty — no hardcoded backends");
    }
  } else {
    console.log("[orchestrator] No mcp-servers.json found — skipping hardcoded backends");
  }

  // --- Phase 2: User-registered servers from user-servers.json ---
  const registry = loadRegistry();
  const userServerNames = Object.keys(registry.servers);

  if (userServerNames.length > 0) {
    console.log(`[registry] Reconnecting ${userServerNames.length} user-registered server(s): ${userServerNames.join(", ")}`);

    for (const serverName of userServerNames) {
      const entry = registry.servers[serverName];
      try {
        await connectAndRegisterServer(serverName, entry.url);
      } catch (err: any) {
        console.error(`[registry] ✗ Failed to reconnect "${serverName}" (${entry.url}): ${err.message}`);
      }
    }
  } else {
    console.log("[registry] No user-registered servers to reconnect");
  }

  const totalTools = connectedBackends.reduce((sum, b) => sum + b.toolCount, 0);
  console.log(`[orchestrator] Startup complete. ${connectedBackends.length} backend(s) connected, ${totalTools} total tools registered.`);
}

// ============================================
// Local Tool 1: Add a contact
// ============================================
server.tool(
  {
    name: "add-contact",
    description: "Save a contact with a name and phone number. Use this to store contacts so you can call or text them by name later.",
    schema: z.object({
      name: z.string().describe("The contact's name (e.g. 'Anirudh')"),
      phone: z.string().describe("The contact's phone number with country code (e.g. '+19525551234')"),
    }),
  },
  async ({ name, phone }) => {
    const contacts = loadContacts();
    contacts[name] = phone;
    saveContacts(contacts);
    return object({ saved: true, name, phone, totalContacts: Object.keys(contacts).length });
  }
);

// ============================================
// Local Tool 2: List all contacts
// ============================================
server.tool(
  {
    name: "list-contacts",
    description: "List all saved contacts. Returns all names and phone numbers.",
    schema: z.object({}),
    readOnlyHint: true,
  },
  async () => {
    const contacts = loadContacts();
    const entries = Object.entries(contacts);
    if (entries.length === 0) {
      return text("No contacts saved yet. Use add-contact to save some.");
    }
    return object({
      totalContacts: entries.length,
      contacts: Object.fromEntries(entries),
    });
  }
);

// ============================================
// Local Tool 3: Remove a contact
// ============================================
server.tool(
  {
    name: "remove-contact",
    description: "Remove a contact by name.",
    schema: z.object({
      name: z.string().describe("The name of the contact to remove"),
    }),
  },
  async ({ name }) => {
    const contacts = loadContacts();
    const key = Object.keys(contacts).find(
      (k) => k.toLowerCase() === name.toLowerCase()
    );
    if (!key) {
      return error(`Contact "${name}" not found. Use list-contacts to see all contacts.`);
    }
    delete contacts[key];
    saveContacts(contacts);
    return object({ removed: true, name: key, totalContacts: Object.keys(contacts).length });
  }
);

// ============================================
// Gateway Tool: Register an MCP server
// ============================================
server.tool(
  {
    name: "register-mcp",
    description:
      "Register a new MCP server with Lark. Paste a server URL and give it a name. Lark will connect, discover all its tools, and make them available. Example: register-mcp('my-notion', 'https://notion-mcp.example.com/mcp')",
    schema: z.object({
      name: z
        .string()
        .describe(
          "A short, unique name for this server (e.g. 'notion', 'twilio', 'my-api'). Used as a prefix for all its tools."
        ),
      url: z
        .string()
        .describe(
          "The full MCP server URL (e.g. 'https://my-server.run.mcp-use.com/mcp')"
        ),
    }),
  },
  async ({ name, url }) => {
    const safeName = name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-");

    // Check if already registered
    const registry = loadRegistry();
    if (registry.servers[safeName] && !removedServers.has(safeName)) {
      return error(
        `Server "${safeName}" is already registered with ${registry.servers[safeName].tools.length} tools. Use remove-mcp first to re-register.`
      );
    }

    // If it was previously removed, clear the flag so the tools work again
    removedServers.delete(safeName);

    try {
      const toolNames = await connectAndRegisterServer(safeName, url);
      return object({
        registered: true,
        name: safeName,
        url,
        toolCount: toolNames.length,
        tools: toolNames,
        message: `Successfully registered "${safeName}" with ${toolNames.length} tool(s). You can now use them directly.`,
      });
    } catch (err: any) {
      return error(
        `Failed to connect to "${safeName}" at ${url}: ${err.message}`
      );
    }
  }
);

// ============================================
// Gateway Tool: List all registered MCP servers
// ============================================
server.tool(
  {
    name: "list-mcps",
    description:
      "List all MCP servers registered with Lark, including their URLs, tool counts, and tool names. Shows both hardcoded backends and user-registered servers.",
    schema: z.object({}),
    readOnlyHint: true,
  },
  async () => {
    const registry = loadRegistry();
    const userServers = Object.entries(registry.servers)
      .filter(([name]) => !removedServers.has(name))
      .map(([name, info]) => ({
        name,
        url: info.url,
        addedAt: info.addedAt,
        toolCount: info.tools.length,
        tools: info.tools,
        source: "user-registered" as const,
      }));

    const hardcodedServers = connectedBackends
      .filter((b) => !registry.servers[b.name])
      .map((b) => ({
        name: b.name,
        toolCount: b.toolCount,
        source: "hardcoded" as const,
      }));

    const totalServers = userServers.length + hardcodedServers.length;
    const totalTools =
      userServers.reduce((s, sv) => s + sv.toolCount, 0) +
      hardcodedServers.reduce((s, sv) => s + sv.toolCount, 0);

    if (totalServers === 0) {
      return text(
        "No MCP servers registered yet. Use register-mcp to add one."
      );
    }

    return object({
      totalServers,
      totalTools,
      userRegistered: userServers,
      hardcoded: hardcodedServers,
    });
  }
);

// ============================================
// Gateway Tool: Remove a registered MCP server
// ============================================
server.tool(
  {
    name: "remove-mcp",
    description:
      "Remove a previously registered MCP server from Lark. Its tools will stop working immediately. Use list-mcps to see registered servers.",
    schema: z.object({
      name: z
        .string()
        .describe("The name of the server to remove (as shown in list-mcps)"),
    }),
  },
  async ({ name }) => {
    const safeName = name.toLowerCase();
    const registry = loadRegistry();

    if (!registry.servers[safeName]) {
      return error(
        `Server "${safeName}" not found. Use list-mcps to see registered servers.`
      );
    }

    const removedTools = registry.servers[safeName].tools;

    // Mark as removed so proxied calls are blocked
    removedServers.add(safeName);
    liveSessions.delete(safeName);

    // Remove from persisted registry
    delete registry.servers[safeName];
    saveRegistry(registry);

    // Also remove from connectedBackends tracking
    const idx = connectedBackends.findIndex((b) => b.name === safeName);
    if (idx !== -1) connectedBackends.splice(idx, 1);

    console.log(
      `[registry] ✗ Removed "${safeName}" (${removedTools.length} tools disabled)`
    );

    return object({
      removed: true,
      name: safeName,
      disabledTools: removedTools,
      message: `Removed "${safeName}". Its ${removedTools.length} tool(s) are now disabled.`,
    });
  }
);

// ============================================
// Local Tool: Wake up Lark — shows the full UI
// ============================================
server.tool(
  {
    name: "wake-up-lark",
    description: "Wake up the Lark AI communication suite. Shows a full phone-like interface where the user can make calls, send messages, play music, and more — all from the UI. Use this when the user says 'wake up lark', 'open lark', 'start lark', or wants to use the Lark interface.",
    schema: z.object({
      greeting: z.string().optional().describe("Optional greeting message to show the user"),
    }),
    widget: {
      name: "lark",
      invoking: "Waking up Lark...",
      invoked: "Lark is ready",
    },
  },
  async ({ greeting }) => {
    return widget({
      props: {
        status: "active",
        greeting: greeting || "Lark is awake!",
      },
      output: text("Lark is awake! The user can now use the phone interface to make calls, send messages, play music, and more. The interface is interactive — the user can click icons directly to use tools."),
    });
  }
);

// ============================================
// Local Tool 4: Make a phone call via Twilio
// Accepts a phone number OR a contact name
// ============================================
server.tool(
  {
    name: "make-call",
    description: "Make a phone call to someone using Twilio. You can pass a phone number OR a contact name (e.g. 'Anirudh'). The call will play a spoken message to the person.",
    schema: z.object({
      to: z.string().describe("Phone number (e.g. +19525551234) OR contact name (e.g. 'Anirudh')"),
      message: z.string().describe("The message to speak to the person when they pick up"),
    }),
    widget: {
      name: "make-call",
      invoking: "Placing call...",
      invoked: "Call placed",
    },
  },
  async ({ to, message }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return error("Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env");
    }

    // Resolve contact name to phone number
    const resolved = resolvePhoneNumber(to);
    if (!resolved) {
      return error(`Contact "${to}" not found. Use add-contact to save them first, or provide a phone number directly.`);
    }
    const phoneNumber = resolved.phone;
    const contactLabel = resolved.name ? `${resolved.name} (${resolved.phone})` : resolved.phone;

    const twiml = `<Response><Say voice="alice">${message}</Say></Response>`;

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: fromNumber,
          Twiml: twiml,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return error(`Twilio call failed: ${err}`);
    }

    const call = await res.json();
    return widget({
      props: {
        status: "Call initiated",
        callSid: call.sid,
        to: contactLabel,
        from: call.from,
        message,
      },
      output: text(`Call initiated to ${contactLabel} from ${call.from}. Call SID: ${call.sid}`),
    });
  }
);


// ============================================
// Local Tool 8: Group call — call multiple people simultaneously
// ============================================
server.tool(
  {
    name: "group-call",
    description: "Call multiple people at the same time with the same message. Pass contact names or phone numbers. All calls are placed simultaneously via Twilio. Example: 'Call Anirudh, Raj, and Priya and say I'm running late'.",
    schema: z.object({
      to: z.array(z.string()).describe("List of phone numbers or contact names to call (e.g. ['Anirudh', 'Raj', '+19525551234'])"),
      message: z.string().describe("The message to speak to everyone when they pick up"),
    }),
  },
  async ({ to, message }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return error("Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env");
    }

    // Resolve all contacts first
    const resolved: { label: string; phone: string }[] = [];
    const notFound: string[] = [];

    for (const entry of to) {
      const result = resolvePhoneNumber(entry);
      if (result) {
        resolved.push({
          label: result.name ? `${result.name} (${result.phone})` : result.phone,
          phone: result.phone,
        });
      } else {
        notFound.push(entry);
      }
    }

    if (notFound.length > 0) {
      return error(`Could not find contacts: ${notFound.join(", ")}. Use add-contact to save them first.`);
    }

    const twiml = `<Response><Say voice="alice">${message}</Say></Response>`;
    const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    // Fire all calls simultaneously
    const results = await Promise.allSettled(
      resolved.map(async (contact) => {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: contact.phone,
              From: fromNumber,
              Twiml: twiml,
            }),
          }
        );
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`${contact.label}: ${errText}`);
        }
        const call = await res.json();
        return { label: contact.label, callSid: call.sid, status: "initiated" };
      })
    );

    const succeeded: { label: string; callSid: string }[] = [];
    const failed: { label: string; error: string }[] = [];

    for (const r of results) {
      if (r.status === "fulfilled") {
        succeeded.push(r.value);
      } else {
        failed.push({ label: "unknown", error: r.reason?.message || "Unknown error" });
      }
    }

    const summary = [
      `Group call to ${resolved.length} people: "${message}"`,
      `Succeeded: ${succeeded.length}/${resolved.length}`,
      ...succeeded.map((s) => `  ✓ ${s.label} — SID: ${s.callSid}`),
      ...failed.map((f) => `  ✗ ${f.label} — ${f.error}`),
    ].join("\n");

    return object({
      message,
      totalCalls: resolved.length,
      succeeded: succeeded.length,
      failed: failed.length,
      calls: succeeded,
      errors: failed.length > 0 ? failed : undefined,
      summary,
    });
  }
);

// ============================================
// Music: Audius + Deezer search helpers
// ============================================

interface AudiusTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  artworkUrl: string;
}

async function searchAudius(query: string): Promise<AudiusTrack[]> {
  try {
    const res = await fetch(
      `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&limit=5`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();
    if (!data.data) return [];
    return data.data
      .filter((t: any) => t.id && t.duration > 0)
      .map((t: any) => ({
        id: t.id,
        title: t.title || "Unknown",
        artist: t.user?.name || "",
        duration: t.duration,
        artworkUrl: t.artwork?.["480x480"] || t.artwork?.["150x150"] || "",
      }));
  } catch {
    return [];
  }
}

interface DeezerTrack {
  title: string;
  artist: string;
  album: string;
  previewUrl: string;
  coverUrl: string;
  duration: number;
}

async function searchDeezer(query: string): Promise<DeezerTrack[]> {
  try {
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    if (!data.data) return [];
    return data.data.map((t: any) => ({
      title: t.title,
      artist: t.artist?.name || "",
      album: t.album?.title || "",
      previewUrl: t.preview,
      coverUrl: t.album?.cover_big || t.album?.cover_medium || "",
      duration: t.duration,
    }));
  } catch {
    return [];
  }
}

// ============================================
// Music: Audio stream proxy (Audius → same-origin)
// ============================================

server.get("/stream/:trackId", async (c) => {
  const trackId = c.req.param("trackId");
  const streamUrl = `https://api.audius.co/v1/tracks/${trackId}/stream`;

  const reqHeaders: Record<string, string> = { "User-Agent": "LarkMCP/1.0" };
  const range = c.req.header("Range");
  if (range) reqHeaders["Range"] = range;

  try {
    const audioRes = await fetch(streamUrl, { headers: reqHeaders, redirect: "follow" });
    if (!audioRes.ok && audioRes.status !== 206) {
      return c.text("Stream not available", 404);
    }
    const respHeaders: Record<string, string> = {
      "Content-Type": audioRes.headers.get("Content-Type") || "audio/mpeg",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=600",
    };
    const cl = audioRes.headers.get("Content-Length");
    if (cl) respHeaders["Content-Length"] = cl;
    const cr = audioRes.headers.get("Content-Range");
    if (cr) respHeaders["Content-Range"] = cr;

    return new Response(audioRes.body, { status: audioRes.status, headers: respHeaders });
  } catch {
    return c.text("Stream error", 502);
  }
});

// ============================================
// Music: Cover image proxy (same-origin for CSP)
// ============================================

server.get("/cover", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.text("Missing url", 400);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return c.text("Not found", 404);
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return c.text("Failed", 502);
  }
});

// ============================================
// Local Tool: Music play — search + return structured data
// ============================================
server.tool(
  {
    name: "music-play",
    description:
      "Search and play a song by name. Returns structured track data (title, artist, album art, stream URL) for inline playback in the Lark widget.",
    schema: z.object({
      query: z.string().describe("Song name, artist, or keywords"),
    }),
  },
  async ({ query }) => {
    const [audiusResults, deezerResults] = await Promise.all([
      searchAudius(query),
      searchDeezer(query),
    ]);

    const audius = audiusResults[0];
    const deezer = deezerResults[0];

    if (!audius && !deezer) {
      return error(`No results found for "${query}"`);
    }

    return object({
      title: deezer?.title || audius?.title || query,
      artist: deezer?.artist || audius?.artist || "",
      album: deezer?.album || "",
      coverUrl: deezer?.coverUrl || audius?.artworkUrl || "",
      audiusTrackId: audius?.id || "",
      previewUrl: deezer?.previewUrl || "",
      duration: audius?.duration || deezer?.duration || 0,
      isFullTrack: !!audius,
    });
  }
);

// ============================================
// Local Tool: Music search — return structured results list
// ============================================
server.tool(
  {
    name: "music-search",
    description:
      "Search for songs across Audius and Deezer. Returns a list of results with title, artist, and source.",
    schema: z.object({
      query: z.string().describe("Song name, artist, or keywords"),
    }),
  },
  async ({ query }) => {
    const [audiusResults, deezerResults] = await Promise.all([
      searchAudius(query),
      searchDeezer(query),
    ]);

    if (audiusResults.length === 0 && deezerResults.length === 0) {
      return error(`No results found for "${query}"`);
    }

    const fmt = (s: number) =>
      Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

    return object({
      results: [
        ...audiusResults.slice(0, 3).map((r) => ({
          title: r.title,
          artist: r.artist,
          duration: fmt(r.duration),
          source: "audius",
          fullTrack: true,
        })),
        ...deezerResults.slice(0, 3).map((r) => ({
          title: r.title,
          artist: r.artist,
          album: r.album,
          duration: fmt(r.duration),
          source: "deezer",
          fullTrack: false,
        })),
      ],
    });
  }
);

// ============================================
// Resource: Server config and status (dynamic)
// ============================================
server.resource(
  {
    name: "config",
    uri: "config://settings",
    title: "Server Configuration",
    description: "Current server configuration and status",
    mimeType: "application/json",
  },
  async () => {
    const registry = loadRegistry();
    const userServers = Object.entries(registry.servers)
      .filter(([name]) => !removedServers.has(name))
      .map(([name, info]) => ({
        name,
        url: info.url,
        toolCount: info.tools.length,
      }));

    return object({
      name: "Lark MCP Gateway",
      version: "1.0.0",
      status: "running",
      connectedServers: connectedBackends.length,
      backends: connectedBackends,
      userRegistered: userServers,
    });
  }
);

// ============================================
// Prompt: Code review
// ============================================
server.prompt(
  {
    name: "review-code",
    description: "Review code for best practices and potential issues",
    schema: z.object({
      language: completable(z.string(), [
        "python",
        "javascript",
        "typescript",
        "java",
        "go",
        "rust",
      ]).describe("The programming language of the code"),
      code: z.string().describe("The code snippet to review"),
    }),
  },
  async ({ language, code }) => {
    return text(
      `Please review the following ${language} code for best practices, potential bugs, and improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }
);

// ============================================
// Start: Connect backends, then listen
// ============================================
await connectBackendServers();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
server.listen(PORT);
