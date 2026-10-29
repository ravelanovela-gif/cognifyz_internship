const { getCached, setCached } = require("../lib/cache");

async function getWeather(city) {
  const cacheKey = city.trim().toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const encodedCity = encodeURIComponent(city);
  const geocodingResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodedCity}&count=1&language=en&format=json`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!geocodingResponse.ok) throw new Error("The location service is temporarily unavailable.");
  const locationData = await geocodingResponse.json();
  const location = locationData.results && locationData.results[0];
  if (!location) {
    const error = new Error("We couldn't find that city. Check the spelling and try again.");
    error.status = 404;
    throw error;
  }

  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!weatherResponse.ok) throw new Error("The weather service is temporarily unavailable.");
  const weatherData = await weatherResponse.json();
  const result = {
    city: location.name,
    country: location.country,
    temperature: weatherData.current.temperature_2m,
    feelsLike: weatherData.current.apparent_temperature,
    humidity: weatherData.current.relative_humidity_2m,
    windSpeed: weatherData.current.wind_speed_10m,
    weatherCode: weatherData.current.weather_code,
    units: weatherData.current_units
  };
  setCached(cacheKey, result, 5 * 60 * 1000);
  return result;
}

module.exports = { getWeather };
