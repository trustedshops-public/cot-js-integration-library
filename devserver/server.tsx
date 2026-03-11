import https from 'node:https';
import fs from "node:fs";
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { InFileAuthStorage } from './in-file-authstorage';
import { Client, CookieHandlerInterface, ActionType } from '../src';
import { createServer } from 'vite';
import 'dotenv/config';

const port = process.env.PORT || 5174;
const base = process.env.BASE || '/';
const debugAuthCookies = process.env.DEBUG_AUTH_COOKIES === 'true';

const clientId = process.env.CLIENT_ID || "";
const clientSecret = process.env.CLIENT_SECRET || "";

if (!clientId || !clientSecret) {
  console.error("Please set CLIENT_ID and CLIENT_SECRET environment variables.");
  process.exit(1);
}

const keyPath = path.resolve(import.meta.dirname, "../certs/localhost-key.pem");
const certPath = path.resolve(import.meta.dirname, "../certs/localhost.pem");

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error("SSL certificates not found. Run 'npm run generate-ssl-cert' first.");
  process.exit(1);
}

// Create express app
const app = express();
app.use(cookieParser());

// Create vite server in middleware mode
const vite = await createServer({
  server: {
    middlewareMode: true,
    hmr: {
      protocol: 'wss',
      host: '127.0.0.1',
      port: 5174,
    },
  },
  appType: 'custom',
  base,
  root: path.resolve(import.meta.dirname),
});

// Add vite middleware
app.use(vite.middlewares);

const authStorage = new InFileAuthStorage(path.resolve(import.meta.dirname, "auth-storage.json"));
const client = new Client(
  clientId,
  clientSecret,
  authStorage,
  "test"
);

const getJwtSub = (token?: string): string | null => {
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    ) as { sub?: string };

    return payload.sub ?? null;
  } catch {
    return null;
  }
};

// Serve HTML
app.get('/{*path}', async (req, res) => {
  try {
    // Keep a request-scoped cookie state so backend reads reflect cookies set earlier in this same request.
    const requestCookies: Record<string, string | undefined> = { ...req.cookies };

    const cookieHandler: CookieHandlerInterface = {
      get: (key: string) => {
        return Promise.resolve(requestCookies[key]);
      },
      set: (key: string, value: string, expireDatetime?: Date) => {
        requestCookies[key] = value;
        res.cookie(key, value, {
          expires: expireDatetime,
          secure: req.protocol === 'https',
          sameSite: 'lax',
          httpOnly: true,
          path: '/',
        });
        return Promise.resolve();
      },
      remove: (key: string) => {
        delete requestCookies[key];
        res.clearCookie(key, {
          secure: req.protocol === 'https',
          sameSite: 'lax',
          httpOnly: true,
          path: '/',
        });
        return Promise.resolve();
      },
    };
    client.setCookieHandler(cookieHandler);
    client.setRedirectUri(`${req.protocol}://${req.get('host')}${req.originalUrl}`);

    if (debugAuthCookies) {
      const incomingSub = getJwtSub(requestCookies.TRSTD_ID_TOKEN);
      const hasStoredTokenForIncomingIdToken = incomingSub
        ? Boolean(await authStorage.get(incomingSub))
        : false;

      console.log('[auth-debug] incoming request', {
        path: req.originalUrl,
        hasIdToken: Boolean(requestCookies.TRSTD_ID_TOKEN),
        hasCodeVerifier: Boolean(requestCookies.TRSTD_CV),
        hasCodeChallenge: Boolean(requestCookies.TRSTD_CC),
        hasStoredTokenForIncomingIdToken,
      });
    }

    await client.handleCallback(
      req.query.code as string,
      req.query.cotAction as ActionType
    );

    const authUser = await client.getConsumerData();

    if (debugAuthCookies) {
      const currentSub = getJwtSub(requestCookies.TRSTD_ID_TOKEN);
      const hasStoredTokenForCurrentIdToken = currentSub
        ? Boolean(await authStorage.get(currentSub))
        : false;

      console.log('[auth-debug] backend state after auth/data', {
        path: req.originalUrl,
        hasIdToken: Boolean(requestCookies.TRSTD_ID_TOKEN),
        hasCodeVerifier: Boolean(requestCookies.TRSTD_CV),
        hasCodeChallenge: Boolean(requestCookies.TRSTD_CC),
        hasAuthUser: Boolean(authUser),
        hasStoredTokenForCurrentIdToken,
      });
    }

    const url = req.originalUrl.replace(base, '');
    const template = await vite.transformIndexHtml(url, fs.readFileSync(path.resolve(import.meta.dirname, 'index.html'), 'utf-8'));
    const render = (await vite.ssrLoadModule(path.resolve(import.meta.dirname, 'src/entry-server.tsx'))).render;
    const rendered = await render(url);

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '')
      .replace(`<!--app-html-->`, rendered.html ?? '')
      .replace(`<!--app-authuser-->`, authUser ? `<script>var authUser = ${JSON.stringify(authUser, null, 2)}</script>` : "");

    res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    vite?.ssrFixStacktrace(err);
    console.log(err.stack);
    res.status(500).end(err.stack);
  }
});

// Create HTTPS server
https.createServer({
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
}, app).listen(port, () => {
  console.log(`Server started at https://localhost:${port}`);
});