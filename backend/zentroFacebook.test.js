import crypto from 'crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMessengerProfile,
  buildZentroMessengerLink,
  buildZentroPost,
  parseZentroAmount,
  processZentroMessengerEvent,
  verifyZentroWebhookSignature,
} from './zentroFacebook.js';

test('builds a Mongolian Messenger greeting with two entry choices', () => {
  const profile = buildMessengerProfile({
    profileGreeting: 'Сайн байна уу, {{user_first_name}}!',
  });
  assert.equal(profile.greeting[0].text, 'Сайн байна уу, {{user_first_name}}!');
  assert.deepEqual(profile.ice_breakers.map(item => item.payload), ['ZENTRO_CAR', 'ZENTRO_LOAN']);
  assert.deepEqual(profile.persistent_menu[0].call_to_actions.map(item => item.payload), ['ZENTRO_CAR', 'ZENTRO_LOAN']);
});

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

test('builds a Messenger referral link without dropping the Page path', () => {
  const link = buildZentroMessengerLink(
    { messengerUrl: 'https://m.me/JapanCarDealership' },
    'zpc-post-loan-66abcdef1234567890abcdef'
  );
  assert.equal(link, 'https://m.me/JapanCarDealership?ref=zpc-post-loan-66abcdef1234567890abcdef');
});

test('starts Messenger with separate car and loan choices', async () => {
  const senderId = 'facebook-user-entry';
  const { model: SessionModel, sessions } = createSessionModel();
  const sent = [];
  const send = async (recipientId, message, options = []) => sent.push({ recipientId, message, options });
  const config = {
    products: [],
    social: { autoReplyEnabled: true },
  };

  await processZentroMessengerEvent({
    event: textEvent(senderId, 'entry-1', 'hi'),
    config,
    ZentroLoanRequest: {},
    SessionModel,
    send,
  });

  assert.equal(sessions.get(senderId).state, 'idle');
  assert.deepEqual(sent.at(-1).options.map(option => option.payload), ['ZENTRO_CAR', 'ZENTRO_LOAN']);
});

test('hands a car inquiry to the Auto Market conversation', async () => {
  const senderId = 'facebook-user-car';
  const { model: SessionModel, sessions } = createSessionModel();
  const sent = [];
  const send = async (recipientId, message, options = []) => sent.push({ recipientId, message, options });
  const config = { products: [], social: { autoReplyEnabled: true } };
  const process = event => processZentroMessengerEvent({ event, config, ZentroLoanRequest: {}, SessionModel, send });

  await process({ sender: { id: senderId }, postback: { payload: 'ZENTRO_CAR' } });
  assert.equal(sessions.get(senderId).state, 'await_car_inquiry');
  await process(textEvent(senderId, 'car-1', 'Toyota Land Cruiser 200, 2018 оноос хойш'));

  assert.equal(sessions.get(senderId).state, 'car_handoff');
  assert.match(sent.at(-1).message, /ажилтан энэ чатад/);
});

test('routes a post referral into the matching loan conversation', async () => {
  const senderId = 'facebook-user-referral';
  const postId = '66abcdef1234567890abcdef';
  const { model: SessionModel, sessions } = createSessionModel();
  const sent = [];
  const tracked = [];
  const send = async (recipientId, message, options = []) => sent.push({ recipientId, message, options });
  const PostModel = { async updateOne(filter, update) { tracked.push({ filter, update }); } };

  await processZentroMessengerEvent({
    event: { sender: { id: senderId }, referral: { ref: `zpc-post-loan-${postId}` } },
    config: { products: [], social: { autoReplyEnabled: true } },
    ZentroLoanRequest: {},
    SessionModel,
    PostModel,
    send,
  });

  assert.equal(sessions.get(senderId).topic, 'loan');
  assert.equal(tracked.length, 1);
  assert.equal(tracked[0].filter._id, postId);
  assert.match(sent.at(-1).message, /Зээлийн мэдээллээс/);
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
