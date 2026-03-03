#!/usr/bin/env deno

import { validateEnv } from './types.ts';
import { processSlackMessage } from './types.ts';

const env = validateEnv();

const body = await Deno.readAll(Deno.stdin);
const payload = new TextDecoder().decode(body);

let event;

try {
  const parsed = JSON.parse(payload);
  
  // Handle Slack challenge for URL verification
  if (parsed.challenge) {
    console.log(JSON.stringify({ challenge: parsed.challenge }));
    Deno.exit(0);
  }

  event = parsed.event;
} catch (error) {
  console.error('Invalid JSON payload', error);
  console.log(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
  Deno.exit(1);
}

try {
  await processSlackMessage(event, env);
  console.log(JSON.stringify({ ok: true, message: 'Memory saved' }));
} catch (error) {
  console.error('Error processing message:', error);
  console.log(JSON.stringify({ ok: false, error: error.message }));
  Deno.exit(1);
}
