import crypto from 'crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildZentroPost,
  parseZentroAmount,
  processZentroMessengerEvent,
  verifyZentroWebhookSignature,
} from './zentroFacebook.js';

function createSessionModel() {
  const sessions = new Map();
  class Session {
    constructor(senderId) {
      this.senderId = senderId;
      this.state = 'idle';
      this.draft = {};
      this.processedMessageIds = [];
    }

    async save() {
      sessions.set(this.senderId, this);
      return this;
    }
  }

  return {
    sessions,
    model: {
      async exists({ senderId, processedMessageIds }) {
        return sessions.get(senderId)?.processedMessageIds.includes(processedMessageIds) || false;
      },
      async findOneAndUpdate({ senderId }) {
        if (!sessions.has(senderId)) sessions.set(senderId, new Session(senderId));
        return sessions.get(senderId);
      },
    },
  };
}

function textEvent(senderId, mid, text) {
  return { sender: { id: senderId }, message: { mid, text } };
}

function quickReplyEvent(senderId, mid, text, payload) {
  return { sender: { id: senderId }, message: { mid, text, quick_reply: { payload } } };
}

test('validates Meta SHA256 webhook signatures', () => {
  const body = Buffer.from('{"object":"page"}');
  const secret = 'test-app-secret';
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  assert.equal(verifyZentroWebhookSignature(body, signature, secret), true);
  assert.equal(verifyZentroWebhookSignature(body, `${signature.slice(0, -1)}0`, secret), false);
  assert.equal(verifyZentroWebhookSignature(body, '', secret), false);
});

test('parses common Mongolian amount formats', () => {
  assert.equal(parseZentroAmount('10 сая'), 10_000_000);
  assert.equal(parseZentroAmount('12,500,000'), 12_500_000);
  assert.equal(parseZentroAmount('250 мянга'), 250_000);
  assert.equal(Number.isNaN(parseZentroAmount('дүнгүй')), true);
});

test('builds a daily post from live product values', () => {
  const result = buildZentroPost({
    phone: '7599-1919',
    products: [{ name: 'Машин барьцаалсан зээл', description: 'Машинаа унаад явна.', rate: '3%-аас', term: '12 сар', amount: '70% хүртэл', images: ['https://example.com/car.jpg'] }],
    social: { postTemplates: ['{{product}} | {{rate}} | {{website}}'], postUseProductImage: true },
  }, new Date('2026-08-15T02:00:00.000Z'));
  assert.match(result.message, /Машин барьцаалсан зээл/);
  assert.match(result.message, /3%-аас/);
  assert.match(result.message, /zentrocapitalgroup\.com/);
  assert.equal(result.imageUrl, 'https://example.com/car.jpg');
});

test('collects a Messenger application and deduplicates retried events', async () => {
  const senderId = 'facebook-user-1';
  const { model: SessionModel, sessions } = createSessionModel();
  const sent = [];
  const requests = [];
  const send = async (recipientId, message, options = []) => sent.push({ recipientId, message, options });
  const ZentroLoanRequest = {
    async create(value) {
      const request = { ...value, _id: '66abcdef1234567890abcdef' };
      requests.push(request);
      return request;
    },
  };
  const config = {
    phone: '7599-1919',
    email: 'info@zentrocapitalgroup.com',
    address: 'Улаанбаатар',
    products: [{ name: 'Машинаа унаад авах зээл', rate: '3%-аас', term: '1-24 сар', amount: '70% хүртэл' }],
    social: { autoReplyEnabled: true, requestIntakeEnabled: true },
  };
  const process = event => processZentroMessengerEvent({ event, config, ZentroLoanRequest, SessionModel, send });

  await process({ sender: { id: senderId }, postback: { payload: 'ZENTRO_APPLY' } });
  await process(textEvent(senderId, 'm1', 'Bat Erdene'));
  assert.equal(sessions.get(senderId).state, 'await_name');
  await process(textEvent(senderId, 'm2', 'Бат Эрдэнэ'));
  await process(textEvent(senderId, 'm3', '9911223'));
  assert.equal(sessions.get(senderId).state, 'await_phone');
  await process(textEvent(senderId, 'm4', '99112233'));
  await process(quickReplyEvent(senderId, 'm5', '1. Машинаа унаад', 'ZENTRO_PRODUCT_0'));
  await process(textEvent(senderId, 'm6', '10 сая'));
  await process(textEvent(senderId, 'm7', '12'));
  const finalEvent = textEvent(senderId, 'm8', 'Toyota Prius 2018, 1234 УБА');
  await process(finalEvent);
  await process(finalEvent);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].name, 'Бат Эрдэнэ');
  assert.equal(requests[0].phone, '99112233');
  assert.equal(requests[0].amount, 10_000_000);
  assert.equal(requests[0].termMonths, 12);
  assert.equal(requests[0].source, 'facebook');
  assert.equal(sessions.get(senderId).state, 'idle');
  assert.match(sent.at(-1).message, /амжилттай бүртгэлээ/);
});

