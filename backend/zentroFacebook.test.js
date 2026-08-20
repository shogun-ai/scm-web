import crypto from 'crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMessengerListingElements,
  buildMessengerProfile,
  buildZentroMessengerLink,
  buildZentroPost,
  normalizeFacebookPostImages,
  parseZentroAmount,
  processZentroMessengerEvent,
  removeZentroWebsiteApplicationHandoff,
  selectMetaWebhookApp,
  verifyZentroWebhookSignature,
} from './zentroFacebook.js';

test('builds a Mongolian Messenger greeting with two entry choices', () => {
  const profile = buildMessengerProfile({
    profileGreeting: 'Сайн байна уу, {{user_first_name}}!',
  });
  assert.equal(profile.greeting[0].text, 'Сайн байна уу, {{user_first_name}}!');
  assert.deepEqual(profile.ice_breakers.map(item => item.payload), ['ZENTRO_LISTINGS', 'ZENTRO_LOAN']);
  assert.deepEqual(profile.persistent_menu[0].call_to_actions.map(item => item.payload), ['ZENTRO_LISTINGS', 'ZENTRO_LOAN']);
});

test('builds active listing cards with Page and in-chat actions', () => {
  const elements = buildMessengerListingElements([{
    id: 'page_123',
    title: 'Toyota Land Cruiser 200',
    description: '2018 он, хар өнгө',
    imageUrl: 'https://example.com/car.jpg',
    permalinkUrl: 'https://facebook.com/example/posts/123',
  }]);
  assert.equal(elements.length, 1);
  assert.equal(elements[0].image_url, 'https://example.com/car.jpg');
  assert.deepEqual(elements[0].buttons.map(button => button.type), ['web_url', 'postback', 'postback']);
  assert.equal(elements[0].buttons[2].payload, 'ZENTRO_LISTING_LOAN_page_123');
});

test('deduplicates and limits a Facebook post to five images', () => {
  const images = normalizeFacebookPostImages(
    ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/1.jpg', 'https://example.com/3.jpg', 'https://example.com/4.jpg'],
    'https://example.com/5.jpg',
    'https://example.com/6.jpg'
  );
  assert.deepEqual(images, [
    'https://example.com/1.jpg',
    'https://example.com/2.jpg',
    'https://example.com/3.jpg',
    'https://example.com/4.jpg',
    'https://example.com/5.jpg',
  ]);
});

test('removes the old website application handoff from Messenger-linked posts', () => {
  const message = removeZentroWebsiteApplicationHandoff([
    'Машин барьцаалсан шуурхай зээл',
    '',
    'Дэлгэрэнгүй: https://zentrocapitalgroup.com/#apply',
    '',
    'Зээлийн эцсийн нөхцөл гэрээгээр баталгаажна.',
  ].join('\n'));
  assert.doesNotMatch(message, /zentrocapitalgroup\.com\/#apply/);
  assert.match(message, /Зээлийн эцсийн нөхцөл/);
});

test('selects the Zentro Meta app for app-level webhook configuration', () => {
  const apps = [
    { id: 'legacy', name: 'Legacy Messenger' },
    { id: '1031086889986131', name: 'ZPC loan bot' },
  ];
  assert.equal(selectMetaWebhookApp(apps)?.id, '1031086889986131');
  assert.equal(selectMetaWebhookApp(apps, 'legacy')?.id, 'legacy');
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
  assert.deepEqual(sent.at(-1).options.map(option => option.payload), ['ZENTRO_LISTINGS', 'ZENTRO_LOAN']);
});

test('shows active Page listings when a conversation starts', async () => {
  const senderId = 'facebook-user-listings';
  const { model: SessionModel } = createSessionModel();
  const sent = [];
  const carousels = [];
  const listings = [{ id: 'page_42', title: 'Toyota Prius 30', permalinkUrl: 'https://facebook.com/posts/42' }];
  await processZentroMessengerEvent({
    event: textEvent(senderId, 'listing-entry-1', 'hi'),
    config: { products: [], social: { autoReplyEnabled: true } },
    ZentroLoanRequest: {},
    SessionModel,
    send: async (recipientId, message, options = []) => sent.push({ recipientId, message, options }),
    fetchListings: async () => listings,
    sendListings: async (recipientId, values) => carousels.push({ recipientId, values }),
  });

  assert.equal(carousels.length, 1);
  assert.equal(carousels[0].values[0].id, 'page_42');
  assert.match(sent.at(-1).message, /Энэ зарыг асуух/);
});

test('hands a car inquiry to the Auto Market conversation', async () => {
  const senderId = 'facebook-user-car';
  const { model: SessionModel, sessions } = createSessionModel();
  const sent = [];
  const send = async (recipientId, message, options = []) => sent.push({ recipientId, message, options });
  const config = { products: [], social: { autoReplyEnabled: true } };
  const process = event => processZentroMessengerEvent({ event, config, ZentroLoanRequest: {}, SessionModel, send });

  await process({ sender: { id: senderId }, postback: { payload: 'ZENTRO_CAR_QUESTION' } });
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

test('starts and completes a loan request from a selected Page listing', async () => {
  const senderId = 'facebook-user-listing-loan';
  const { model: SessionModel } = createSessionModel();
  const requests = [];
  const listings = [{ id: 'page_99', title: 'Toyota Land Cruiser 200', permalinkUrl: 'https://facebook.com/posts/99' }];
  const config = {
    products: [{ name: 'Автомашин барьцаалсан зээл' }],
    social: { autoReplyEnabled: true, requestIntakeEnabled: true },
  };
  const ZentroLoanRequest = {
    async create(value) {
      const request = { ...value, _id: '66abcdef1234567890abcdef' };
      requests.push(request);
      return request;
    },
  };
  const process = event => processZentroMessengerEvent({
    event,
    config,
    ZentroLoanRequest,
    SessionModel,
    send: async () => {},
    fetchListings: async () => listings,
    sendListings: async () => {},
  });

  await process({ sender: { id: senderId }, postback: { payload: 'ZENTRO_LISTING_LOAN_page_99' } });
  await process(textEvent(senderId, 'listing-loan-1', 'Бат Эрдэнэ'));
  await process(textEvent(senderId, 'listing-loan-2', '99112233'));
  await process(quickReplyEvent(senderId, 'listing-loan-3', 'Автомашины зээл', 'ZENTRO_PRODUCT_0'));
  await process(textEvent(senderId, 'listing-loan-4', '20 сая'));
  await process(textEvent(senderId, 'listing-loan-5', '24'));

  assert.equal(requests.length, 1);
  assert.equal(requests[0].collateral, 'Toyota Land Cruiser 200');
  assert.equal(requests[0].answers.facebookListingId, 'page_99');
  assert.equal(requests[0].answers.facebookListingUrl, 'https://facebook.com/posts/99');
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
