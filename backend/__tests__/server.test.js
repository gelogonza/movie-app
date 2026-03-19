const request = require('supertest');
const app = require('../server');

describe('GET /health', () => {
  test('returns status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('returns a valid ISO timestamp', async () => {
    const res = await request(app).get('/health');

    const parsed = new Date(res.body.timestamp);
    expect(parsed.toISOString()).toBe(res.body.timestamp);
  });
});

describe('unknown routes', () => {
  test('POST to an unknown API path returns 404', async () => {
    const res = await request(app).post('/nonexistent');

    expect(res.status).toBe(404);
  });
});

describe('CORS headers', () => {
  test('responses include Access-Control-Allow-Origin', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('JSON parsing', () => {
  test('accepts application/json content type on POST /recommend', async () => {
    const res = await request(app)
      .post('/recommend')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ mood: 'happy' }));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
