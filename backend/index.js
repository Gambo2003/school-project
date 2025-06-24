import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const API_KEY = '4d8fb5b93d4af21d66a2948710284366';

const weatherCache = new Map();
const forecastCache = new Map();
const CACHE_DURATION = 2 * 60 * 1000;

app.get('/', (c) => c.text('Weather Backend is running!'));

app.get('/weather', async (c) => {
  const city = c.req.query('city');
  const lat = c.req.query('lat');
  const lon = c.req.query('lon');
  let cacheKey;
  let url;
  if (lat && lon) {
    cacheKey = `lat:${lat},lon:${lon}`;
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${API_KEY}`;
  } else if (city) {
    cacheKey = city.toLowerCase();
    url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  } else {
    return c.json({ error: 'City or coordinates (lat, lon) are required' }, 400);
  }
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_DURATION) {
    return c.json(cached.data);
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return c.json({ error: 'Location not found' }, 404);
    }
    const data = await response.json();
    const result = {
      city: data.name,
      temperature: data.main.temp,
      condition: data.weather[0].description,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      wind_speed: data.wind.speed,
      pressure: data.main.pressure,
      date: new Date().toISOString(),
      coord: data.coord
    };
    weatherCache.set(cacheKey, { data: result, time: Date.now() });
    return c.json(result);
  } catch (err) {
    return c.json({ error: 'Failed to fetch weather data' }, 500);
  }
});

app.get('/forecast', async (c) => {
  const city = c.req.query('city');
  const lat = c.req.query('lat');
  const lon = c.req.query('lon');
  let cacheKey;
  let url;
  if (lat && lon) {
    cacheKey = `lat:${lat},lon:${lon}`;
    url = `https://api.openweathermap.org/data/2.5/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${API_KEY}`;
  } else if (city) {
    cacheKey = city.toLowerCase();
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  } else {
    return c.json({ error: 'City or coordinates (lat, lon) are required' }, 400);
  }
  const cached = forecastCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_DURATION) {
    return c.json(cached.data);
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return c.json({ error: 'Location not found' }, 404);
    }
    const data = await response.json();
    const dailyForecasts = data.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5);
    const forecast = dailyForecasts.map(item => ({
      date: item.dt_txt,
      temp: item.main.temp,
      icon: item.weather[0].icon,
      description: item.weather[0].description
    }));
    const result = { city: data.city.name, forecast, coord: data.city.coord };
    forecastCache.set(cacheKey, { data: result, time: Date.now() });
    return c.json(result);
  } catch (err) {
    return c.json({ error: 'Failed to fetch forecast data' }, 500);
  }
});

serve({
  fetch: app.fetch,
  port: 3000
});
console.log('Hono server running on http://localhost:3000');
