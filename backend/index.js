import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';

const app = new Hono();

// Enable CORS for all routes with explicit options
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const API_KEY = '4d8fb5b93d4af21d66a2948710284366'; // OpenWeatherMap API key

app.get('/', (c) => c.text('Weather Backend is running!'));

// Weather endpoint with real data
app.get('/weather', async (c) => {
  const city = c.req.query('city');
  if (!city) {
    return c.json({ error: 'City is required' }, 400);
  }
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
    );
    if (!response.ok) {
      return c.json({ error: 'City not found' }, 404);
    }
    const data = await response.json();
    return c.json({
      city: data.name,
      temperature: data.main.temp,
      condition: data.weather[0].description,
      date: new Date().toISOString()
    });
  } catch (err) {
    return c.json({ error: 'Failed to fetch weather data' }, 500);
  }
});

// Start the server on port 3000
serve({
  fetch: app.fetch,
  port: 3000
});
console.log('Hono server running on http://localhost:3000');
