const FALLBACK = { latitude: 10.8231, longitude: 106.6297 };

function safeCoordinate(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const latitude = safeCoordinate(req.query?.latitude, -90, 90, FALLBACK.latitude);
  const longitude = safeCoordinate(req.query?.longitude, -180, 180, FALLBACK.longitude);
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,is_day,weather_code',
    timezone: 'auto',
    forecast_days: '1',
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.current) {
      throw new Error(data?.reason || `Weather service returned HTTP ${response.status}`);
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone || '',
      current: {
        temperature: data.current.temperature_2m,
        apparentTemperature: data.current.apparent_temperature,
        weatherCode: data.current.weather_code,
        isDay: Number(data.current.is_day) === 1,
        observedAt: data.current.time || null,
      },
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: 'Weather data is temporarily unavailable.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
