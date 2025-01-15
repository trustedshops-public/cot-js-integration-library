import https from 'node:https';
import fs from "fs";
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { InFileAuthStorage } from './in-file-authstorage';
import { Client, CookieHandlerInterface, ActionType } from '../src';
import { createServer } from 'vite';
import 'dotenv/config';

const port = process.env.PORT || 5174;
const base = process.env.BASE || '/';

const tsId = process.env.TS_ID || "";
const clientId = process.env.CLIENT_ID || "";
const clientSecret = process.env.CLIENT_SECRET || "";

if (!tsId || !clientId || !clientSecret) {
  console.error("Please set TS_ID, CLIENT_ID and CLIENT_SECRET environment variables.");
  process.exit(1);
}

// Create https server
const app = express();
app.use(cookieParser());
const vite = await createServer({
  server: {
    middlewareMode: true,
    https: {
      key: fs.existsSync(path.resolve(import.meta.dirname, "../certs/localhost-key.pem"))
        ? fs.readFileSync(path.resolve(import.meta.dirname, "../certs/localhost-key.pem")) : undefined,
      cert: fs.existsSync(path.resolve(import.meta.dirname, "../certs/localhost.pem")) ?
        fs.readFileSync(path.resolve(import.meta.dirname, "../certs/localhost.pem")) : undefined,
    }
  },
  appType: 'custom',
  base,
})
app.use(vite.middlewares)
const authStorage = new InFileAuthStorage(path.resolve(import.meta.dirname, "auth-storage.json"));
const client = new Client(
  tsId,
  clientId,
  clientSecret,
  authStorage,
  "test"
);

// Serve HTML
app.all('*', async (req, res) => {
  try {
    const cookieHandler: CookieHandlerInterface = {
      get: (key: string) => {
        return req.cookies[key];
      },
      set: (key: string, value: string, expireDatetime?: Date) => {
        res.cookie(key, value, {
          expires: expireDatetime,
          sameSite: "strict",
          secure: true,
        });
      },
      remove: (key: string) => {
        res.clearCookie(key);
      },
    };
    client.setCookieHandler(cookieHandler);

    await client.handleCallback(
      req.query.code as string,
      req.query.cotAction as ActionType
    );

    const authUser = await client.getAnonymousConsumerData();

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
    vite?.ssrFixStacktrace(e);
    console.log(e.stack);
    res.status(500).end(e.stack);
  }
})

https.createServer({
  key: fs.existsSync(path.resolve(import.meta.dirname, "../certs/localhost-key.pem"))
    ? fs.readFileSync(path.resolve(import.meta.dirname, "../certs/localhost-key.pem"))
    : undefined,
  cert: fs.existsSync(path.resolve(import.meta.dirname, "../certs/localhost.pem"))
    ? fs.readFileSync(path.resolve(import.meta.dirname, "../certs/localhost.pem"))
    : undefined,
}, app).listen(port, () => {
  console.log(`Server started at https://localhost:${port}`);
});